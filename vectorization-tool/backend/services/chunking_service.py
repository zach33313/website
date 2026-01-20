"""Chunking service with multiple strategies."""

from typing import List, Dict, Any, Optional
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
)
from langchain_experimental.text_splitter import SemanticChunker
from langchain_huggingface import HuggingFaceEmbeddings
import re


def count_tokens(text: str, model: str = "gpt-4") -> int:
    """Estimate token count (approx 4 chars per token for English)."""
    return len(text) // 4


def get_token_boundaries(text: str, model: str = "gpt-4") -> List[Dict[str, Any]]:
    """Get approximate token boundaries for visualization."""
    # Simple word-based tokenization as approximation
    words = re.findall(r'\S+|\s+', text)
    boundaries = []
    current_pos = 0

    for i, word in enumerate(words):
        start = text.find(word, current_pos)
        if start == -1:
            start = current_pos
        end = start + len(word)

        boundaries.append({
            "index": i,
            "token_id": i,
            "text": word,
            "start": start,
            "end": end
        })

        current_pos = end

    return boundaries


class ChunkingService:
    """Service for chunking text with various strategies."""

    STRATEGIES = {
        "recursive": "Recursive Character (Recommended)",
        "fixed_char": "Fixed Character Size",
        "sentence": "Sentence-Based",
        "paragraph": "Paragraph-Based",
        "semantic": "Semantic (AI-powered)",
    }

    DEFAULT_SEPARATORS = ["\n\n", "\n", ". ", ", ", " ", ""]

    def __init__(self, embedding_model: str = "all-MiniLM-L6-v2"):
        self._embeddings = None
        self._embedding_model = embedding_model

    def _get_embeddings(self):
        """Lazy-load embeddings model for semantic chunking."""
        if self._embeddings is None:
            self._embeddings = HuggingFaceEmbeddings(
                model_name=self._embedding_model,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True}
            )
        return self._embeddings

    def chunk(
        self,
        text: str,
        strategy: str = "recursive",
        chunk_size: int = 450,
        chunk_overlap: int = 90,
        size_metric: str = "characters",
        separators: Optional[List[str]] = None,
        keep_separator: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Chunk text using the specified strategy.

        Args:
            text: Text to chunk
            strategy: Chunking strategy
            chunk_size: Size of each chunk
            chunk_overlap: Overlap between chunks
            size_metric: Whether to use tokens or characters
            separators: Custom separators (for recursive strategy)
            keep_separator: Whether to keep separators in chunks

        Returns:
            List of chunk dicts with text and metadata
        """
        if strategy == "recursive":
            chunks = self._chunk_recursive(
                text, chunk_size, chunk_overlap, separators, keep_separator
            )
        elif strategy == "fixed_char" or strategy == "fixed":
            chunks = self._chunk_fixed_char(text, chunk_size, chunk_overlap)
        elif strategy == "sentence":
            chunks = self._chunk_sentence(text, chunk_size, chunk_overlap)
        elif strategy == "paragraph":
            chunks = self._chunk_paragraph(text, chunk_size, chunk_overlap)
        elif strategy == "semantic":
            chunks = self._chunk_semantic(text)
        else:
            raise ValueError(f"Unknown strategy: {strategy}")

        # Add metadata to each chunk
        return self._add_metadata(text, chunks, chunk_overlap)

    def _chunk_recursive(
        self,
        text: str,
        chunk_size: int,
        chunk_overlap: int,
        separators: Optional[List[str]],
        keep_separator: bool
    ) -> List[str]:
        """Recursive character text splitter."""
        seps = separators or self.DEFAULT_SEPARATORS

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=seps,
            keep_separator=keep_separator
        )

        return splitter.split_text(text)

    def _chunk_fixed_char(
        self,
        text: str,
        chunk_size: int,
        chunk_overlap: int
    ) -> List[str]:
        """Fixed character size chunking."""
        splitter = CharacterTextSplitter(
            separator="",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        return splitter.split_text(text)

    def _chunk_sentence(
        self,
        text: str,
        chunk_size: int,
        chunk_overlap: int
    ) -> List[str]:
        """Sentence-based chunking."""
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)

        chunks = []
        current_chunk = []
        current_size = 0

        for sentence in sentences:
            sentence_size = len(sentence)

            if current_size + sentence_size > chunk_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                # Keep some sentences for overlap
                overlap_sentences = []
                overlap_size = 0
                for s in reversed(current_chunk):
                    s_size = len(s)
                    if overlap_size + s_size <= chunk_overlap:
                        overlap_sentences.insert(0, s)
                        overlap_size += s_size
                    else:
                        break
                current_chunk = overlap_sentences
                current_size = overlap_size

            current_chunk.append(sentence)
            current_size += sentence_size

        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks

    def _chunk_paragraph(
        self,
        text: str,
        chunk_size: int,
        chunk_overlap: int
    ) -> List[str]:
        """Paragraph-based chunking."""
        paragraphs = text.split("\n\n")

        chunks = []
        current_chunk = []
        current_size = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            para_size = len(para)

            if current_size + para_size > chunk_size and current_chunk:
                chunks.append("\n\n".join(current_chunk))
                # Keep some paragraphs for overlap
                overlap_paras = []
                overlap_size = 0
                for p in reversed(current_chunk):
                    p_size = len(p)
                    if overlap_size + p_size <= chunk_overlap:
                        overlap_paras.insert(0, p)
                        overlap_size += p_size
                    else:
                        break
                current_chunk = overlap_paras
                current_size = overlap_size

            current_chunk.append(para)
            current_size += para_size

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks

    def _chunk_semantic(
        self,
        text: str,
        breakpoint_threshold_type: str = "percentile",
        breakpoint_threshold_amount: float = 90.0
    ) -> List[str]:
        """
        Semantic chunking using embeddings to detect topic shifts.

        Uses LangChain's SemanticChunker with HuggingFace embeddings.
        """
        embeddings = self._get_embeddings()

        chunker = SemanticChunker(
            embeddings,
            breakpoint_threshold_type=breakpoint_threshold_type,
            breakpoint_threshold_amount=breakpoint_threshold_amount
        )

        docs = chunker.create_documents([text])
        return [doc.page_content for doc in docs]

    def _add_metadata(
        self,
        original_text: str,
        chunks: List[str],
        chunk_overlap: int
    ) -> List[Dict[str, Any]]:
        """Add metadata to each chunk."""
        result = []
        search_start = 0

        for i, chunk_text in enumerate(chunks):
            # Find chunk position in original text
            start = original_text.find(chunk_text, search_start)
            if start == -1:
                # Fallback: use approximate position
                start = search_start
            end = start + len(chunk_text)

            is_first = i == 0
            is_last = i == len(chunks) - 1

            # Determine overlap with previous chunk
            overlap_end = None
            if not is_first and i > 0:
                prev_chunk = chunks[i - 1]
                for j in range(min(len(chunk_text), len(prev_chunk))):
                    if chunk_text[:j+1] in prev_chunk:
                        overlap_end = j + 1

            result.append({
                "id": f"chunk_{i}",
                "index": i,
                "content": chunk_text,
                "text": chunk_text,
                "metadata": {
                    "chunk_index": i,
                    "start_char": start,
                    "end_char": end,
                    "char_count": len(chunk_text),
                    "word_count": len(chunk_text.split()),
                },
                "char_start": start,
                "char_end": end,
                "char_count": len(chunk_text),
                "token_count": count_tokens(chunk_text),
                "word_count": len(chunk_text.split()),
                "is_first": is_first,
                "is_last": is_last,
                "overlap_char_count": overlap_end if overlap_end else 0
            })

            search_start = start + len(chunk_text) - chunk_overlap

        return result

    def get_strategies(self) -> Dict[str, str]:
        """Get available chunking strategies."""
        return self.STRATEGIES

    def preview_chunk_boundaries(
        self,
        text: str,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate preview data for chunk boundary visualization.

        Returns list of segments with their chunk assignments.
        """
        segments = []

        for i, chunk in enumerate(chunks):
            # Check if this chunk overlaps with next
            is_overlap = False
            if i < len(chunks) - 1:
                next_chunk = chunks[i + 1]
                is_overlap = chunk["char_end"] > next_chunk["char_start"]

            segments.append({
                "chunk_index": i,
                "start": chunk["char_start"],
                "end": chunk["char_end"],
                "text": chunk.get("text") or chunk.get("content"),
                "is_overlap_region": False,
                "token_count": chunk["token_count"]
            })

            # Add overlap segment if exists
            if is_overlap and i < len(chunks) - 1:
                next_chunk = chunks[i + 1]
                overlap_start = next_chunk["char_start"]
                overlap_end = chunk["char_end"]
                overlap_text = text[overlap_start:overlap_end]

                segments.append({
                    "chunk_index": i,
                    "next_chunk_index": i + 1,
                    "start": overlap_start,
                    "end": overlap_end,
                    "text": overlap_text,
                    "is_overlap_region": True,
                    "token_count": count_tokens(overlap_text)
                })

        return segments
