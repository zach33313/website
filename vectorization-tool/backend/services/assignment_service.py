"""Assignment service for syncing and managing Canvas assignments."""

import re
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
import chromadb
from chromadb.config import Settings as ChromaSettings
from pathlib import Path

from services.database_service import DatabaseService
from services.canvas_client import CanvasClient, CanvasConfig
from services.embedding_service import EmbeddingService
from services.document_parser import parse_document
import requests
import tempfile


def chunk_text_by_paragraph(text: str, min_length: int = 50) -> List[str]:
    """
    Split text into meaningful paragraphs for querying.

    Args:
        text: The text to chunk
        min_length: Minimum characters for a chunk to be included

    Returns:
        List of paragraph chunks
    """
    if not text:
        return []

    # Clean HTML tags
    text = re.sub(r'<[^>]+>', '\n', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&[a-z]+;', ' ', text)

    # Split by multiple newlines (paragraph breaks)
    paragraphs = re.split(r'\n\s*\n+', text)

    # Also split on common list patterns and headers
    chunks = []
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        # If paragraph has numbered/bulleted items, split those too
        if re.search(r'^\s*[\d•\-\*]\s*\.?\s+', para, re.MULTILINE):
            items = re.split(r'\n\s*(?=[\d•\-\*]\s*\.?\s+)', para)
            for item in items:
                item = item.strip()
                if len(item) >= min_length:
                    chunks.append(item)
        elif len(para) >= min_length:
            chunks.append(para)

    # If we got nothing, try splitting by sentences
    if not chunks and text.strip():
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        # Group sentences into reasonable chunks
        current_chunk = []
        current_len = 0
        for sent in sentences:
            current_chunk.append(sent)
            current_len += len(sent)
            if current_len >= min_length:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                current_len = 0
        if current_chunk:
            chunks.append(' '.join(current_chunk))

    return chunks


@dataclass
class SyncResult:
    """Result of assignment sync operation."""
    total_synced: int = 0
    new_assignments: int = 0
    updated_assignments: int = 0
    courses_processed: int = 0
    errors: List[str] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []


@dataclass
class ChunkSearchResult:
    """A relevant chunk found for an assignment."""
    chunk_id: str
    content: str
    filename: str
    relevance_score: float
    metadata: Dict[str, Any]


class AssignmentService:
    """Service for syncing and managing Canvas assignments."""

    def __init__(
        self,
        db: DatabaseService,
        canvas_api_url: str,
        canvas_api_token: str,
        openai_api_key: Optional[str] = None,
        chroma_persist_dir: str = "./chroma_db"
    ):
        self.db = db
        self.canvas_client = CanvasClient(CanvasConfig(
            api_url=canvas_api_url,
            api_token=canvas_api_token
        ))
        self.embedding_service = EmbeddingService(openai_api_key=openai_api_key)
        self.chroma_persist_dir = chroma_persist_dir
        self._chroma_client = None

    def _get_chroma_client(self) -> chromadb.ClientAPI:
        """Get or create ChromaDB client."""
        if self._chroma_client is None:
            Path(self.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
            self._chroma_client = chromadb.PersistentClient(
                path=self.chroma_persist_dir,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
        return self._chroma_client

    # =========================================================================
    # Assignment Sync
    # =========================================================================

    def sync_assignments(
        self,
        course_ids: Optional[List[int]] = None,
        favorites_only: bool = True,
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> SyncResult:
        """
        Sync assignments from Canvas for specified courses.

        If no course_ids provided, syncs from favorited courses only (by default).
        Set favorites_only=False to sync from all active courses.
        """
        result = SyncResult()

        try:
            # Get courses to sync
            if course_ids:
                courses = []
                for cid in course_ids:
                    try:
                        course = self.canvas_client.get_course(cid)
                        courses.append(course)
                    except Exception as e:
                        result.errors.append(f"Failed to get course {cid}: {str(e)}")
            else:
                courses = self.canvas_client.get_courses(favorites_only=favorites_only)

            for course in courses:
                course_id = course.get("id")
                course_name = course.get("name", f"Course {course_id}")

                if progress_callback:
                    progress_callback(f"Syncing assignments from {course_name}...")

                try:
                    assignments = self._get_course_assignments(course_id)

                    for assignment in assignments:
                        # Check if new or existing
                        existing = self.db.get_assignment_by_canvas_id(assignment["id"])

                        # Prepare assignment data
                        assignment_data = {
                            "canvas_assignment_id": assignment["id"],
                            "course_id": course_id,
                            "course_name": course_name,
                            "name": assignment.get("name", "Untitled"),
                            "description": assignment.get("description"),
                            "due_at": assignment.get("due_at"),
                            "points_possible": assignment.get("points_possible"),
                            "submission_types": assignment.get("submission_types", []),
                            "html_url": assignment.get("html_url")
                        }

                        self.db.upsert_assignment(assignment_data)
                        result.total_synced += 1

                        if existing:
                            result.updated_assignments += 1
                        else:
                            result.new_assignments += 1

                    result.courses_processed += 1

                except Exception as e:
                    result.errors.append(f"Failed to sync {course_name}: {str(e)}")

            if progress_callback:
                progress_callback(
                    f"Sync complete: {result.total_synced} assignments "
                    f"({result.new_assignments} new, {result.updated_assignments} updated)"
                )

        except Exception as e:
            result.errors.append(f"Sync failed: {str(e)}")

        return result

    def _get_course_assignments(self, course_id: int) -> List[Dict[str, Any]]:
        """Get all assignments for a course from Canvas."""
        return self.canvas_client._get_paginated(f"courses/{course_id}/assignments")

    # =========================================================================
    # Assignment Retrieval
    # =========================================================================

    def get_assignment(self, assignment_id: int) -> Optional[Dict[str, Any]]:
        """Get a single assignment by local ID."""
        return self.db.get_assignment(assignment_id)

    def get_assignments(
        self,
        course_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get assignments with optional filters."""
        return self.db.get_assignments(
            course_id=course_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

    def get_upcoming_assignments(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get assignments due in the next N days."""
        return self.db.get_upcoming_assignments(days)

    # =========================================================================
    # Assignment File Content Extraction
    # =========================================================================

    def get_assignment_file_content(
        self,
        assignment_id: int,
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch and parse files attached to an assignment.

        Looks for file links in the assignment description HTML,
        downloads them, and parses their content.

        Returns:
            List of dicts with 'filename', 'content', and 'file_id'
        """
        assignment = self.db.get_assignment(assignment_id)
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        description = assignment.get("description", "")
        if not description:
            return []

        # Extract file IDs from description HTML
        file_ids = set()
        # Standard Canvas file links
        file_ids.update(re.findall(r'/files/(\d+)', description))
        # API endpoint references
        file_ids.update(re.findall(r'data-api-endpoint="[^"]*files/(\d+)"', description))
        # Download links
        file_ids.update(re.findall(r'/download\?.*file_id=(\d+)', description))

        if not file_ids:
            return []

        if progress_callback:
            progress_callback(f"Found {len(file_ids)} attached files")

        parsed_files = []

        for file_id in file_ids:
            try:
                # Get file metadata from Canvas
                file_data = self.canvas_client._get(f"files/{file_id}")
                filename = file_data.get("display_name") or file_data.get("filename", f"file_{file_id}")
                download_url = file_data.get("url")

                if not download_url:
                    continue

                if progress_callback:
                    progress_callback(f"Downloading {filename}...")

                # Download the file
                response = requests.get(download_url, timeout=60)
                response.raise_for_status()

                # Parse the file content
                parsed = parse_document(response.content, filename)
                content = parsed.get("content", "")

                if content.strip():
                    # Clean the content
                    from services.batch_service import clean_pdf_text
                    content = clean_pdf_text(content)

                    parsed_files.append({
                        "file_id": file_id,
                        "filename": filename,
                        "content": content
                    })

                    if progress_callback:
                        progress_callback(f"Parsed {filename}: {len(content)} chars")

            except Exception as e:
                if progress_callback:
                    progress_callback(f"Failed to get file {file_id}: {str(e)}")
                continue

        return parsed_files

    def get_full_assignment_content(
        self,
        assignment_id: int,
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> str:
        """
        Get the full content of an assignment including attached files.

        Combines:
        1. Assignment name
        2. Assignment description (cleaned)
        3. Content from all attached files

        Returns:
            Combined text content
        """
        assignment = self.db.get_assignment(assignment_id)
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        parts = [f"Assignment: {assignment['name']}\n"]

        # Add cleaned description
        if assignment.get("description"):
            desc = re.sub(r'<[^>]+>', '\n', assignment["description"])
            desc = re.sub(r'&nbsp;', ' ', desc)
            desc = re.sub(r'&[a-z]+;', ' ', desc)
            desc = re.sub(r'\s+', ' ', desc).strip()
            if desc:
                parts.append(f"\nDescription:\n{desc}\n")

        # Add attached file content
        attached_files = self.get_assignment_file_content(assignment_id, progress_callback)
        for file_info in attached_files:
            parts.append(f"\n--- Attached File: {file_info['filename']} ---\n")
            parts.append(file_info['content'])
            parts.append("\n")

        return "\n".join(parts)

    # =========================================================================
    # Relevant Chunk Discovery
    # =========================================================================

    def find_relevant_chunks(
        self,
        assignment_id: int,
        collection_name: str = "canvas_materials",
        embedding_model: str = "text-embedding-3-large",
        n_results: int = 10,
        save_to_db: bool = True
    ) -> List[ChunkSearchResult]:
        """
        Find knowledge chunks relevant to an assignment.

        Uses the assignment name and description to search the vector store.
        """
        assignment = self.db.get_assignment(assignment_id)
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        # Build search query from assignment
        query_parts = [assignment["name"]]
        if assignment.get("description"):
            # Strip HTML tags for better search
            import re
            desc = re.sub(r'<[^>]+>', ' ', assignment["description"])
            desc = re.sub(r'\s+', ' ', desc).strip()
            # Limit description length for query
            if len(desc) > 500:
                desc = desc[:500]
            query_parts.append(desc)

        query_text = " ".join(query_parts)

        # Generate query embedding
        embed_result = self.embedding_service.embed(
            texts=[query_text],
            model=embedding_model
        )
        query_embedding = embed_result.get("embeddings", [[]])[0]

        if not query_embedding:
            return []

        # Query ChromaDB
        client = self._get_chroma_client()
        try:
            collection = client.get_collection(name=collection_name)
        except Exception:
            # Collection doesn't exist
            return []

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            include=["documents", "metadatas", "distances"]
        )

        # Format results
        chunks = []
        if results.get("ids") and results["ids"][0]:
            for i, chunk_id in enumerate(results["ids"][0]):
                distance = results["distances"][0][i] if results.get("distances") else 0
                similarity = 1 - distance  # Convert distance to similarity

                metadata = results["metadatas"][0][i] if results.get("metadatas") else {}

                chunks.append(ChunkSearchResult(
                    chunk_id=chunk_id,
                    content=results["documents"][0][i] if results.get("documents") else "",
                    filename=metadata.get("filename", "Unknown"),
                    relevance_score=similarity,
                    metadata=metadata
                ))

        # Save to database if requested
        if save_to_db and chunks:
            chunk_data = [
                {"chunk_id": c.chunk_id, "relevance_score": c.relevance_score}
                for c in chunks
            ]
            self.db.save_assignment_chunks(assignment_id, chunk_data)

        return chunks

    def find_relevant_chunks_comprehensive(
        self,
        assignment_id: int,
        collection_name: str = "canvas_materials",
        embedding_model: str = "text-embedding-3-large",
        results_per_query: int = 5,
        max_total_chunks: int = 30,
        save_to_db: bool = True,
        include_attached_files: bool = True,
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> List[ChunkSearchResult]:
        """
        Find knowledge chunks using comprehensive paragraph-by-paragraph querying.

        This method:
        1. Fetches attached files from Canvas and parses them
        2. Chunks the full assignment content by paragraph
        3. Queries the vector store for EACH paragraph
        4. Aggregates and deduplicates all results
        5. Returns the most relevant unique chunks

        This provides much better coverage than a single query.
        """
        assignment = self.db.get_assignment(assignment_id)
        if not assignment:
            raise ValueError(f"Assignment {assignment_id} not found")

        # Get ChromaDB collection
        client = self._get_chroma_client()
        try:
            collection = client.get_collection(name=collection_name)
        except Exception:
            return []

        # Build query chunks from assignment
        query_chunks = []

        # Always include the assignment name
        query_chunks.append(assignment["name"])

        # Chunk the description by paragraph
        if assignment.get("description"):
            paragraphs = chunk_text_by_paragraph(assignment["description"])
            query_chunks.extend(paragraphs)

            if progress_callback:
                progress_callback(f"Split description into {len(paragraphs)} paragraphs")

        # Fetch and chunk attached files
        if include_attached_files:
            if progress_callback:
                progress_callback("Checking for attached files...")

            try:
                attached_files = self.get_assignment_file_content(assignment_id, progress_callback)

                for file_info in attached_files:
                    # Chunk each file's content
                    file_paragraphs = chunk_text_by_paragraph(file_info['content'])
                    query_chunks.extend(file_paragraphs)

                    if progress_callback:
                        progress_callback(
                            f"Added {len(file_paragraphs)} paragraphs from {file_info['filename']}"
                        )

            except Exception as e:
                if progress_callback:
                    progress_callback(f"Warning: Could not fetch attached files: {str(e)}")

        if progress_callback:
            progress_callback(f"Querying vector store with {len(query_chunks)} queries...")

        # Query for each chunk and aggregate results
        all_chunks: Dict[str, ChunkSearchResult] = {}  # chunk_id -> result

        for i, query_text in enumerate(query_chunks):
            if not query_text.strip():
                continue

            try:
                # Generate query embedding
                embed_result = self.embedding_service.embed(
                    texts=[query_text],
                    model=embedding_model
                )
                query_embedding = embed_result.get("embeddings", [[]])[0]

                if not query_embedding:
                    continue

                # Query ChromaDB
                results = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=results_per_query,
                    include=["documents", "metadatas", "distances"]
                )

                # Process results
                if results.get("ids") and results["ids"][0]:
                    for j, chunk_id in enumerate(results["ids"][0]):
                        distance = results["distances"][0][j] if results.get("distances") else 0
                        similarity = 1 - distance

                        # If we've seen this chunk, keep the higher relevance score
                        if chunk_id in all_chunks:
                            if similarity > all_chunks[chunk_id].relevance_score:
                                all_chunks[chunk_id].relevance_score = similarity
                        else:
                            metadata = results["metadatas"][0][j] if results.get("metadatas") else {}
                            all_chunks[chunk_id] = ChunkSearchResult(
                                chunk_id=chunk_id,
                                content=results["documents"][0][j] if results.get("documents") else "",
                                filename=metadata.get("filename", "Unknown"),
                                relevance_score=similarity,
                                metadata=metadata
                            )

            except Exception as e:
                if progress_callback:
                    progress_callback(f"Query {i+1} failed: {str(e)}")
                continue

        # Sort by relevance and limit total
        chunks = list(all_chunks.values())
        chunks.sort(key=lambda x: x.relevance_score, reverse=True)
        chunks = chunks[:max_total_chunks]

        if progress_callback:
            progress_callback(f"Found {len(chunks)} unique relevant chunks")

        # Save to database if requested
        if save_to_db and chunks:
            chunk_data = [
                {"chunk_id": c.chunk_id, "relevance_score": c.relevance_score}
                for c in chunks
            ]
            self.db.save_assignment_chunks(assignment_id, chunk_data)

        return chunks

    def get_cached_chunks(
        self,
        assignment_id: int,
        collection_name: str = "canvas_materials"
    ) -> List[ChunkSearchResult]:
        """
        Get cached chunks for an assignment from the database.

        Returns full chunk content by looking up in ChromaDB.
        """
        cached = self.db.get_assignment_chunks(assignment_id)
        if not cached:
            return []

        # Get chunk IDs
        chunk_ids = [c["chunk_id"] for c in cached]
        relevance_map = {c["chunk_id"]: c["relevance_score"] for c in cached}

        # Look up chunks in ChromaDB
        client = self._get_chroma_client()
        try:
            collection = client.get_collection(name=collection_name)
        except Exception:
            return []

        results = collection.get(
            ids=chunk_ids,
            include=["documents", "metadatas"]
        )

        chunks = []
        if results.get("ids"):
            for i, chunk_id in enumerate(results["ids"]):
                metadata = results["metadatas"][i] if results.get("metadatas") else {}

                chunks.append(ChunkSearchResult(
                    chunk_id=chunk_id,
                    content=results["documents"][i] if results.get("documents") else "",
                    filename=metadata.get("filename", "Unknown"),
                    relevance_score=relevance_map.get(chunk_id, 0),
                    metadata=metadata
                ))

        # Sort by relevance
        chunks.sort(key=lambda x: x.relevance_score, reverse=True)
        return chunks

    def process_upcoming_assignments(
        self,
        days: int = 7,
        collection_name: str = "canvas_materials",
        embedding_model: str = "text-embedding-3-large",
        n_results: int = 10,
        progress_callback: Optional[Callable[[str], None]] = None
    ) -> Dict[str, Any]:
        """
        Find and cache relevant chunks for upcoming assignments.

        Only processes assignments that don't have cached chunks yet.
        """
        assignments = self.db.get_upcoming_assignments(days)

        processed = 0
        skipped = 0
        errors = []

        for assignment in assignments:
            if assignment.get("chunks_generated"):
                skipped += 1
                continue

            if progress_callback:
                progress_callback(f"Processing: {assignment['name']}")

            try:
                self.find_relevant_chunks(
                    assignment_id=assignment["id"],
                    collection_name=collection_name,
                    embedding_model=embedding_model,
                    n_results=n_results,
                    save_to_db=True
                )
                processed += 1
            except Exception as e:
                errors.append(f"{assignment['name']}: {str(e)}")

        return {
            "total_assignments": len(assignments),
            "processed": processed,
            "skipped": skipped,
            "errors": errors
        }
