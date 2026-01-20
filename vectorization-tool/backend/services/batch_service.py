"""Batch processing service for file vectorization pipeline."""

import os
import re
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional, Callable, Union
from dataclasses import dataclass, field
import chromadb
from chromadb.config import Settings

from services.document_parser import parse_document, get_supported_formats
from services.chunking_service import ChunkingService
from services.embedding_service import EmbeddingService
from services.markdown_converter import ALL_SUPPORTED as ALL_SUPPORTED_EXTENSIONS
from services.chunking_presets import ChunkingPreset, ContentTypeDetector, ChunkingPresetConfig


def clean_pdf_text(text: str) -> str:
    """
    Clean extracted PDF text to remove noise while preserving useful content.

    Removes:
    - Repeated attribution/professor lines
    - Copyright notices
    - Unicode bullet artifacts
    - Excessive whitespace

    Preserves:
    - Figure/diagram references
    - Actual educational content
    - Mathematical notation (as much as possible)
    """
    if not text:
        return text

    # Fix common unicode bullet point artifacts
    # \uf06e is a common PDF extraction artifact for bullets
    text = re.sub(r'[\uf06e\uf0b7\uf0a7\uf0d8]', '• ', text)

    # Fix other common PDF unicode issues
    text = re.sub(r'[\uf020\uf02b\uf0e0\uf0c5]', ' ', text)  # Various space/arrow chars
    text = re.sub(r'[\uf06c\uf06d]', '', text)  # Random artifacts

    # Remove repeated attribution lines (common pattern: "COURSECODE - Dr. Name")
    # Be careful to not remove first occurrence as it may provide context
    lines = text.split('\n')
    seen_attributions = {}
    cleaned_lines = []

    attribution_pattern = re.compile(
        r'^[A-Z]{2,6}\d{4}\s*[-–]\s*(Dr\.|Prof\.|Professor)\s+[\w\s\.]+$',
        re.IGNORECASE
    )

    for line in lines:
        stripped = line.strip()

        # Check if it's an attribution line
        if attribution_pattern.match(stripped):
            # Keep first occurrence, skip subsequent ones
            if stripped not in seen_attributions:
                seen_attributions[stripped] = True
                cleaned_lines.append(line)
            # Skip duplicate attributions
            continue

        cleaned_lines.append(line)

    text = '\n'.join(cleaned_lines)

    # Remove copyright notices (but keep first occurrence per document)
    # Pattern matches: ©2018 Publisher "Book Title" by Author
    copyright_pattern = re.compile(
        r'©\d{4}\s+[\w\s&]+["\'][\w\s:,]+["\'].*?(?=\n|$)',
        re.IGNORECASE
    )

    # Find all copyright notices
    copyrights = copyright_pattern.findall(text)
    seen_copyrights = set()

    for copyright in copyrights:
        if copyright in seen_copyrights:
            # Remove duplicate copyright notices
            text = text.replace(copyright, '', 1)
        else:
            seen_copyrights.add(copyright)

    # Remove common slide footer patterns that repeat
    # Pattern: just a number on its own line (slide numbers)
    text = re.sub(r'\n\s*\d{1,3}\s*\n', '\n', text)

    # Clean up excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 newlines
    text = re.sub(r'[ \t]{2,}', ' ', text)  # Multiple spaces to single
    text = re.sub(r'^\s+', '', text, flags=re.MULTILINE)  # Leading whitespace per line

    # Remove empty parentheses and brackets (PDF extraction artifacts)
    text = re.sub(r'\(\s*\)', '', text)
    text = re.sub(r'\[\s*\]', '', text)

    # Fix common ligature issues
    text = text.replace('ﬁ', 'fi')
    text = text.replace('ﬂ', 'fl')
    text = text.replace('ﬀ', 'ff')
    text = text.replace('ﬃ', 'ffi')
    text = text.replace('ﬄ', 'ffl')

    return text.strip()


@dataclass
class BatchConfig:
    """Configuration for batch processing."""
    # Chunking settings (can be overridden by preset)
    chunking_strategy: str = "recursive"
    chunk_size: int = 1600  # ~400 tokens (research-backed default)
    chunk_overlap: int = 240  # 15% overlap

    # Preset settings
    preset: Optional[str] = None  # Preset name to use
    auto_detect_preset: bool = True  # Auto-detect content type

    # Embedding settings
    embedding_model: str = "text-embedding-3-large"  # OpenAI large model
    embedding_dimensions: Optional[int] = None

    # ChromaDB settings
    collection_name: str = "canvas_materials"
    persist_directory: str = "./canvas_chroma_db"

    # Processing settings
    batch_size: int = 32
    skip_existing: bool = True
    clean_text: bool = True  # Clean PDF text to remove noise

    # Custom separators (optional)
    separators: Optional[List[str]] = None
    keep_separator: bool = True

    def apply_preset(self, preset: ChunkingPreset) -> 'BatchConfig':
        """Apply a preset's settings to this config."""
        config = preset.value
        self.chunking_strategy = config.strategy
        self.chunk_size = config.chunk_size
        self.chunk_overlap = config.chunk_overlap
        if config.separators:
            self.separators = config.separators
        self.keep_separator = config.keep_separator
        return self

    @classmethod
    def from_preset(
        cls,
        preset: Union[str, ChunkingPreset],
        collection_name: str = "canvas_materials",
        persist_directory: str = "./canvas_chroma_db",
        embedding_model: str = "text-embedding-3-large"
    ) -> 'BatchConfig':
        """Create a BatchConfig from a preset."""
        if isinstance(preset, str):
            preset_enum = ChunkingPreset.get_by_name(preset)
            if not preset_enum:
                raise ValueError(f"Unknown preset: {preset}")
            preset = preset_enum

        config = preset.value
        return cls(
            chunking_strategy=config.strategy,
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap,
            preset=config.name,
            auto_detect_preset=False,
            embedding_model=embedding_model,
            collection_name=collection_name,
            persist_directory=persist_directory,
            separators=config.separators,
            keep_separator=config.keep_separator
        )


@dataclass
class ProcessingResult:
    """Result of processing a single file."""
    filename: str
    success: bool
    chunks_created: int = 0
    embeddings_created: int = 0
    error: Optional[str] = None
    document_id: Optional[str] = None


@dataclass
class BatchResult:
    """Result of batch processing."""
    total_files: int = 0
    successful: int = 0
    failed: int = 0
    total_chunks: int = 0
    total_embeddings: int = 0
    results: List[ProcessingResult] = field(default_factory=list)
    collection_name: str = ""
    persist_directory: str = ""


class BatchService:
    """Service for batch processing files into a vector database."""

    SUPPORTED_EXTENSIONS = ALL_SUPPORTED_EXTENSIONS

    def __init__(self, openai_api_key: Optional[str] = None):
        self.chunking_service = ChunkingService()
        self.embedding_service = EmbeddingService(openai_api_key=openai_api_key)
        self._chroma_client = None
        self._collection = None
        self._current_config: Optional[BatchConfig] = None

    def _get_chroma_client(self, persist_directory: str) -> chromadb.ClientAPI:
        """Get or create ChromaDB client."""
        if self._chroma_client is None or (self._current_config is None) or self._current_config.persist_directory != persist_directory:
            # Ensure directory exists
            Path(persist_directory).mkdir(parents=True, exist_ok=True)

            self._chroma_client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(anonymized_telemetry=False)
            )
        return self._chroma_client

    def _get_collection(self, config: BatchConfig) -> chromadb.Collection:
        """Get or create ChromaDB collection."""
        client = self._get_chroma_client(config.persist_directory)

        # Get model info for metadata
        model_info = self.embedding_service.get_model_info(config.embedding_model)
        dimensions = config.embedding_dimensions or (model_info.get("dimensions") if model_info else 384)

        return client.get_or_create_collection(
            name=config.collection_name,
            metadata={
                "embedding_model": config.embedding_model,
                "dimensions": dimensions,
                "chunking_strategy": config.chunking_strategy,
                "chunk_size": config.chunk_size,
                "chunk_overlap": config.chunk_overlap
            }
        )

    def _generate_document_id(self, filename: str, content: str) -> str:
        """Generate a unique document ID based on filename and content hash."""
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        safe_filename = Path(filename).stem.replace(" ", "_")[:32]
        return f"{safe_filename}_{content_hash}"

    def _generate_chunk_id(self, doc_id: str, chunk_index: int) -> str:
        """Generate a unique chunk ID."""
        return f"{doc_id}_chunk_{chunk_index}"

    def process_file(
        self,
        file_path: str,
        config: BatchConfig,
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> ProcessingResult:
        """Process a single file into the vector database."""
        self._current_config = config
        filename = os.path.basename(file_path)

        try:
            # Read file
            with open(file_path, 'rb') as f:
                content_bytes = f.read()

            # Parse document
            if progress_callback:
                progress_callback(f"Parsing {filename}...")

            parsed = parse_document(content_bytes, filename)
            text_content = parsed.get("content", "")

            # Clean text if enabled (removes PDF artifacts while preserving diagrams/figures)
            if config.clean_text and text_content:
                text_content = clean_pdf_text(text_content)

            if not text_content.strip():
                return ProcessingResult(
                    filename=filename,
                    success=False,
                    error="Empty document or failed to extract text"
                )

            # Auto-detect preset if enabled and no preset specified
            effective_config = config
            detected_preset = None
            if config.auto_detect_preset and not config.preset:
                detected_preset = ContentTypeDetector.detect(
                    filename=filename,
                    content=text_content,
                    file_path=file_path
                )
                # Create a copy of config with preset applied
                effective_config = BatchConfig(
                    chunking_strategy=detected_preset.value.strategy,
                    chunk_size=detected_preset.value.chunk_size,
                    chunk_overlap=detected_preset.value.chunk_overlap,
                    preset=detected_preset.value.name,
                    auto_detect_preset=False,
                    embedding_model=config.embedding_model,
                    embedding_dimensions=config.embedding_dimensions,
                    collection_name=config.collection_name,
                    persist_directory=config.persist_directory,
                    batch_size=config.batch_size,
                    skip_existing=config.skip_existing,
                    separators=detected_preset.value.separators,
                    keep_separator=detected_preset.value.keep_separator
                )
                if progress_callback:
                    progress_callback(f"Auto-detected preset: {detected_preset.value.name} for {filename}")

            # Generate document ID
            doc_id = self._generate_document_id(filename, text_content)

            # Get collection
            collection = self._get_collection(effective_config)

            # Check if document already exists
            if effective_config.skip_existing:
                existing = collection.get(where={"document_id": doc_id})
                if existing and existing.get("ids"):
                    return ProcessingResult(
                        filename=filename,
                        success=True,
                        chunks_created=0,
                        embeddings_created=0,
                        document_id=doc_id,
                        error="Skipped - already exists"
                    )

            # Chunk the document with effective config
            if progress_callback:
                progress_callback(f"Chunking {filename} ({effective_config.chunk_size} chars, {effective_config.chunking_strategy})...")

            chunk_kwargs = {
                "text": text_content,
                "strategy": effective_config.chunking_strategy,
                "chunk_size": effective_config.chunk_size,
                "chunk_overlap": effective_config.chunk_overlap,
            }
            if effective_config.separators:
                chunk_kwargs["separators"] = effective_config.separators
            chunk_kwargs["keep_separator"] = effective_config.keep_separator

            chunks = self.chunking_service.chunk(**chunk_kwargs)

            if not chunks:
                return ProcessingResult(
                    filename=filename,
                    success=False,
                    error="No chunks created"
                )

            # Extract chunk texts
            chunk_texts = [c.get("content", "") for c in chunks]

            # Generate embeddings
            if progress_callback:
                progress_callback(f"Generating embeddings for {filename} ({len(chunks)} chunks)...")

            embed_result = self.embedding_service.embed(
                texts=chunk_texts,
                model=effective_config.embedding_model,
                dimensions=effective_config.embedding_dimensions,
                batch_size=effective_config.batch_size
            )

            embeddings = embed_result.get("embeddings", [])

            # Prepare data for ChromaDB
            ids = [self._generate_chunk_id(doc_id, i) for i in range(len(chunks))]
            metadatas = []

            for i, chunk in enumerate(chunks):
                metadatas.append({
                    "document_id": doc_id,
                    "filename": filename,
                    "file_path": file_path,
                    "chunk_index": i,
                    "start_char": chunk.get("char_start", 0),
                    "end_char": chunk.get("char_end", 0),
                    "char_count": len(chunk_texts[i])
                })

            # Store in ChromaDB
            if progress_callback:
                progress_callback(f"Storing {len(chunks)} chunks in ChromaDB...")

            collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=chunk_texts,
                metadatas=metadatas
            )

            return ProcessingResult(
                filename=filename,
                success=True,
                chunks_created=len(chunks),
                embeddings_created=len(embeddings),
                document_id=doc_id
            )

        except Exception as e:
            return ProcessingResult(
                filename=filename,
                success=False,
                error=str(e)
            )

    def process_directory(
        self,
        directory: str,
        config: BatchConfig,
        recursive: bool = True,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> BatchResult:
        """Process all supported files in a directory."""
        # Find all supported files
        files = self._find_files(directory, recursive)

        return self.process_files(files, config, progress_callback)

    def process_files(
        self,
        file_paths: List[str],
        config: BatchConfig,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> BatchResult:
        """Process a list of files."""
        self._current_config = config

        result = BatchResult(
            total_files=len(file_paths),
            collection_name=config.collection_name,
            persist_directory=config.persist_directory
        )

        for i, file_path in enumerate(file_paths):
            if progress_callback:
                progress_callback(f"Processing {os.path.basename(file_path)}", i + 1, len(file_paths))

            file_result = self.process_file(
                file_path,
                config,
                progress_callback=lambda msg: progress_callback(msg, i + 1, len(file_paths)) if progress_callback else None
            )

            result.results.append(file_result)

            if file_result.success:
                result.successful += 1
                result.total_chunks += file_result.chunks_created
                result.total_embeddings += file_result.embeddings_created
            else:
                result.failed += 1

        return result

    def _find_files(self, directory: str, recursive: bool = True) -> List[str]:
        """Find all supported files in a directory."""
        files = []
        path = Path(directory)

        if recursive:
            pattern = "**/*"
        else:
            pattern = "*"

        for file_path in path.glob(pattern):
            if file_path.is_file() and file_path.suffix.lower() in self.SUPPORTED_EXTENSIONS:
                files.append(str(file_path))

        return sorted(files)

    def query(
        self,
        query_text: str,
        config: BatchConfig,
        n_results: int = 5
    ) -> Dict[str, Any]:
        """Query the vector database."""
        # Generate query embedding
        embed_result = self.embedding_service.embed(
            texts=[query_text],
            model=config.embedding_model,
            dimensions=config.embedding_dimensions
        )

        query_embedding = embed_result.get("embeddings", [[]])[0]

        # Query ChromaDB
        collection = self._get_collection(config)

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )

        # Format results
        formatted = []
        if results.get("ids") and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                formatted.append({
                    "chunk_id": chunk_id,
                    "content": results["documents"][0][i] if results.get("documents") else "",
                    "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                    "distance": results["distances"][0][i] if results.get("distances") else 0,
                    "similarity": 1 - results["distances"][0][i] if results.get("distances") else 1
                })

        return {
            "query": query_text,
            "results": formatted,
            "count": len(formatted)
        }

    def get_collection_info(self, config: BatchConfig) -> Dict[str, Any]:
        """Get information about a collection."""
        collection = self._get_collection(config)

        return {
            "name": collection.name,
            "count": collection.count(),
            "metadata": collection.metadata
        }

    def list_collections(self, persist_directory: str) -> List[Dict[str, Any]]:
        """List all collections in the database."""
        client = self._get_chroma_client(persist_directory)
        collections = client.list_collections()

        return [
            {
                "name": c.name,
                "count": c.count(),
                "metadata": c.metadata
            }
            for c in collections
        ]

    def delete_collection(self, collection_name: str, persist_directory: str) -> bool:
        """Delete a collection."""
        client = self._get_chroma_client(persist_directory)
        try:
            client.delete_collection(collection_name)
            return True
        except Exception:
            return False

    def clear_collection(self, collection_name: str, persist_directory: str) -> Dict[str, Any]:
        """
        Clear all documents from a collection.

        Returns info about what was deleted.
        """
        client = self._get_chroma_client(persist_directory)
        try:
            collection = client.get_collection(collection_name)
            count_before = collection.count()

            # Delete and recreate to clear all data
            metadata = collection.metadata
            client.delete_collection(collection_name)
            client.create_collection(name=collection_name, metadata=metadata)

            return {
                "success": True,
                "collection": collection_name,
                "documents_deleted": count_before,
                "metadata_preserved": metadata
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def get_available_presets() -> List[Dict[str, Any]]:
        """Get list of available chunking presets."""
        return ChunkingPreset.list_presets()

    @staticmethod
    def detect_content_type(
        filename: str,
        content: Optional[str] = None,
        file_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Detect content type for a file and return recommended preset.

        Returns detailed detection info including scores and reasoning.
        """
        return ContentTypeDetector.get_detection_details(filename, content, file_path)
