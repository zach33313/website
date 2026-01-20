"""File tracking database to avoid re-processing files."""

import sqlite3
import hashlib
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass


@dataclass
class TrackedFile:
    """A tracked file record."""
    file_id: str
    filename: str
    course_id: str
    course_name: str
    source: str  # e.g., "files", "page:Slides", "module:Lectures"
    file_hash: Optional[str]
    canvas_modified_at: Optional[str]
    processed_at: str
    collection_name: str
    chunk_count: int
    file_size: int


class FileTracker:
    """SQLite-based file tracking to avoid re-processing."""

    def __init__(self, db_path: str = "./canvas_tracker.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize the database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS processed_files (
                file_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                course_id TEXT NOT NULL,
                course_name TEXT,
                source TEXT,
                file_hash TEXT,
                canvas_modified_at TEXT,
                processed_at TEXT NOT NULL,
                collection_name TEXT NOT NULL,
                chunk_count INTEGER DEFAULT 0,
                file_size INTEGER DEFAULT 0
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_course_id ON processed_files(course_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_collection ON processed_files(collection_name)
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scrape_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id TEXT NOT NULL,
                course_name TEXT,
                collection_name TEXT NOT NULL,
                started_at TEXT NOT NULL,
                completed_at TEXT,
                files_found INTEGER DEFAULT 0,
                files_processed INTEGER DEFAULT 0,
                files_skipped INTEGER DEFAULT 0,
                files_failed INTEGER DEFAULT 0,
                status TEXT DEFAULT 'running'
            )
        """)

        conn.commit()
        conn.close()

    def is_processed(
        self,
        file_id: str,
        collection_name: str,
        canvas_modified_at: Optional[str] = None
    ) -> bool:
        """Check if a file has already been processed."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT canvas_modified_at FROM processed_files
            WHERE file_id = ? AND collection_name = ?
        """, (str(file_id), collection_name))

        row = cursor.fetchone()
        conn.close()

        if not row:
            return False

        # If we have modification times, check if file was updated
        if canvas_modified_at and row[0]:
            return row[0] >= canvas_modified_at

        return True

    def mark_processed(
        self,
        file_id: str,
        filename: str,
        course_id: str,
        course_name: str,
        source: str,
        collection_name: str,
        chunk_count: int = 0,
        file_size: int = 0,
        file_hash: Optional[str] = None,
        canvas_modified_at: Optional[str] = None
    ):
        """Mark a file as processed."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT OR REPLACE INTO processed_files
            (file_id, filename, course_id, course_name, source, file_hash,
             canvas_modified_at, processed_at, collection_name, chunk_count, file_size)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(file_id),
            filename,
            str(course_id),
            course_name,
            source,
            file_hash,
            canvas_modified_at,
            datetime.utcnow().isoformat(),
            collection_name,
            chunk_count,
            file_size
        ))

        conn.commit()
        conn.close()

    def get_processed_files(
        self,
        collection_name: Optional[str] = None,
        course_id: Optional[str] = None
    ) -> List[TrackedFile]:
        """Get list of processed files."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        query = "SELECT * FROM processed_files WHERE 1=1"
        params = []

        if collection_name:
            query += " AND collection_name = ?"
            params.append(collection_name)

        if course_id:
            query += " AND course_id = ?"
            params.append(str(course_id))

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        return [
            TrackedFile(
                file_id=row[0],
                filename=row[1],
                course_id=row[2],
                course_name=row[3],
                source=row[4],
                file_hash=row[5],
                canvas_modified_at=row[6],
                processed_at=row[7],
                collection_name=row[8],
                chunk_count=row[9],
                file_size=row[10]
            )
            for row in rows
        ]

    def get_stats(self, collection_name: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about processed files."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        if collection_name:
            cursor.execute("""
                SELECT
                    COUNT(*) as total_files,
                    SUM(chunk_count) as total_chunks,
                    SUM(file_size) as total_size,
                    COUNT(DISTINCT course_id) as courses
                FROM processed_files
                WHERE collection_name = ?
            """, (collection_name,))
        else:
            cursor.execute("""
                SELECT
                    COUNT(*) as total_files,
                    SUM(chunk_count) as total_chunks,
                    SUM(file_size) as total_size,
                    COUNT(DISTINCT course_id) as courses
                FROM processed_files
            """)

        row = cursor.fetchone()
        conn.close()

        return {
            "total_files": row[0] or 0,
            "total_chunks": row[1] or 0,
            "total_size_bytes": row[2] or 0,
            "total_size_mb": round((row[2] or 0) / 1024 / 1024, 2),
            "courses": row[3] or 0
        }

    def start_scrape(
        self,
        course_id: str,
        course_name: str,
        collection_name: str
    ) -> int:
        """Record the start of a scrape session."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO scrape_history
            (course_id, course_name, collection_name, started_at, status)
            VALUES (?, ?, ?, ?, 'running')
        """, (str(course_id), course_name, collection_name, datetime.utcnow().isoformat()))

        scrape_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return scrape_id

    def complete_scrape(
        self,
        scrape_id: int,
        files_found: int,
        files_processed: int,
        files_skipped: int,
        files_failed: int,
        status: str = "completed"
    ):
        """Record the completion of a scrape session."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE scrape_history
            SET completed_at = ?, files_found = ?, files_processed = ?,
                files_skipped = ?, files_failed = ?, status = ?
            WHERE id = ?
        """, (
            datetime.utcnow().isoformat(),
            files_found,
            files_processed,
            files_skipped,
            files_failed,
            status,
            scrape_id
        ))

        conn.commit()
        conn.close()

    def clear_collection(self, collection_name: str):
        """Clear all tracking data for a collection."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM processed_files WHERE collection_name = ?",
            (collection_name,)
        )

        conn.commit()
        conn.close()

    def clear_course(self, course_id: str, collection_name: str):
        """Clear tracking data for a specific course in a collection."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM processed_files WHERE course_id = ? AND collection_name = ?",
            (str(course_id), collection_name)
        )

        conn.commit()
        conn.close()


def compute_file_hash(content: bytes) -> str:
    """Compute MD5 hash of file content."""
    return hashlib.md5(content).hexdigest()
