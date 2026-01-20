"""SQLite database service for assignment calendar system."""

import sqlite3
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
from datetime import datetime


class DatabaseService:
    """SQLite database manager for assignment calendar data."""

    def __init__(self, db_path: str = "./data/canvas_tracker.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def get_connection(self):
        """Get a database connection with context manager."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self):
        """Initialize database schema."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Assignments synced from Canvas
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS assignments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    canvas_assignment_id INTEGER UNIQUE NOT NULL,
                    course_id INTEGER NOT NULL,
                    course_name TEXT NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    due_at TEXT,
                    points_possible REAL,
                    submission_types TEXT,
                    html_url TEXT,
                    last_synced_at TEXT,
                    chunks_generated BOOLEAN DEFAULT 0,
                    study_guide_generated BOOLEAN DEFAULT 0
                )
            """)

            # Cached relevant chunks per assignment
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS assignment_chunks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    assignment_id INTEGER NOT NULL,
                    chunk_id TEXT NOT NULL,
                    relevance_score REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
                )
            """)

            # Generated study guides and solutions
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS generated_content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    assignment_id INTEGER NOT NULL,
                    content_type TEXT NOT NULL,
                    content_markdown TEXT NOT NULL,
                    citations TEXT,
                    model_used TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
                )
            """)

            # Cron job definitions
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cron_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    job_type TEXT NOT NULL,
                    schedule TEXT NOT NULL,
                    enabled BOOLEAN DEFAULT 1,
                    config TEXT,
                    last_run_at TEXT,
                    next_run_at TEXT
                )
            """)

            # Job execution history
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cron_job_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    result TEXT,
                    error TEXT,
                    FOREIGN KEY (job_id) REFERENCES cron_jobs(id) ON DELETE CASCADE
                )
            """)

            # Calendar events (synced from Canvas or manually created)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS calendar_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    canvas_event_id INTEGER UNIQUE,
                    title TEXT NOT NULL,
                    description TEXT,
                    start_at TEXT NOT NULL,
                    end_at TEXT,
                    event_type TEXT DEFAULT 'event',
                    context_code TEXT,
                    html_url TEXT,
                    last_synced_at TEXT
                )
            """)

            # Create indexes for common queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_assignments_due_at
                ON assignments(due_at)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_assignments_course_id
                ON assignments(course_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_assignment_chunks_assignment_id
                ON assignment_chunks(assignment_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_cron_job_runs_job_id
                ON cron_job_runs(job_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at
                ON calendar_events(start_at)
            """)

    # =========================================================================
    # Assignment Operations
    # =========================================================================

    def upsert_assignment(self, assignment: Dict[str, Any]) -> int:
        """Insert or update an assignment."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Check if exists
            cursor.execute(
                "SELECT id FROM assignments WHERE canvas_assignment_id = ?",
                (assignment["canvas_assignment_id"],)
            )
            existing = cursor.fetchone()

            now = datetime.utcnow().isoformat()
            submission_types = json.dumps(assignment.get("submission_types", []))

            if existing:
                cursor.execute("""
                    UPDATE assignments SET
                        course_id = ?,
                        course_name = ?,
                        name = ?,
                        description = ?,
                        due_at = ?,
                        points_possible = ?,
                        submission_types = ?,
                        html_url = ?,
                        last_synced_at = ?
                    WHERE canvas_assignment_id = ?
                """, (
                    assignment["course_id"],
                    assignment["course_name"],
                    assignment["name"],
                    assignment.get("description"),
                    assignment.get("due_at"),
                    assignment.get("points_possible"),
                    submission_types,
                    assignment.get("html_url"),
                    now,
                    assignment["canvas_assignment_id"]
                ))
                return existing["id"]
            else:
                cursor.execute("""
                    INSERT INTO assignments (
                        canvas_assignment_id, course_id, course_name, name,
                        description, due_at, points_possible, submission_types,
                        html_url, last_synced_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    assignment["canvas_assignment_id"],
                    assignment["course_id"],
                    assignment["course_name"],
                    assignment["name"],
                    assignment.get("description"),
                    assignment.get("due_at"),
                    assignment.get("points_possible"),
                    submission_types,
                    assignment.get("html_url"),
                    now
                ))
                return cursor.lastrowid

    def get_assignment(self, assignment_id: int) -> Optional[Dict[str, Any]]:
        """Get a single assignment by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM assignments WHERE id = ?", (assignment_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_assignment_by_canvas_id(self, canvas_id: int) -> Optional[Dict[str, Any]]:
        """Get a single assignment by Canvas ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM assignments WHERE canvas_assignment_id = ?",
                (canvas_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_assignments(
        self,
        course_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get assignments with optional filters."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM assignments WHERE 1=1"
            params = []

            if course_id:
                query += " AND course_id = ?"
                params.append(course_id)

            if start_date:
                query += " AND due_at >= ?"
                params.append(start_date)

            if end_date:
                query += " AND due_at <= ?"
                params.append(end_date)

            query += " ORDER BY due_at ASC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_upcoming_assignments(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get assignments due in the next N days."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM assignments
                WHERE due_at >= datetime('now')
                AND due_at <= datetime('now', '+' || ? || ' days')
                ORDER BY due_at ASC
            """, (days,))
            return [dict(row) for row in cursor.fetchall()]

    def update_assignment_flags(
        self,
        assignment_id: int,
        chunks_generated: Optional[bool] = None,
        study_guide_generated: Optional[bool] = None
    ):
        """Update assignment processing flags."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            updates = []
            params = []

            if chunks_generated is not None:
                updates.append("chunks_generated = ?")
                params.append(1 if chunks_generated else 0)

            if study_guide_generated is not None:
                updates.append("study_guide_generated = ?")
                params.append(1 if study_guide_generated else 0)

            if updates:
                params.append(assignment_id)
                cursor.execute(
                    f"UPDATE assignments SET {', '.join(updates)} WHERE id = ?",
                    params
                )

    # =========================================================================
    # Assignment Chunks Operations
    # =========================================================================

    def save_assignment_chunks(
        self,
        assignment_id: int,
        chunks: List[Dict[str, Any]]
    ):
        """Save relevant chunks for an assignment."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Clear existing chunks
            cursor.execute(
                "DELETE FROM assignment_chunks WHERE assignment_id = ?",
                (assignment_id,)
            )

            # Insert new chunks
            for chunk in chunks:
                cursor.execute("""
                    INSERT INTO assignment_chunks (assignment_id, chunk_id, relevance_score)
                    VALUES (?, ?, ?)
                """, (
                    assignment_id,
                    chunk["chunk_id"],
                    chunk.get("relevance_score", 0)
                ))

            # Update assignment flag
            cursor.execute(
                "UPDATE assignments SET chunks_generated = 1 WHERE id = ?",
                (assignment_id,)
            )

    def get_assignment_chunks(self, assignment_id: int) -> List[Dict[str, Any]]:
        """Get cached chunks for an assignment."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM assignment_chunks
                WHERE assignment_id = ?
                ORDER BY relevance_score DESC
            """, (assignment_id,))
            return [dict(row) for row in cursor.fetchall()]

    # =========================================================================
    # Generated Content Operations
    # =========================================================================

    def save_generated_content(
        self,
        assignment_id: int,
        content_type: str,
        content_markdown: str,
        citations: Optional[List[str]] = None,
        model_used: Optional[str] = None
    ) -> int:
        """Save generated study guide or solution."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO generated_content (
                    assignment_id, content_type, content_markdown, citations, model_used
                ) VALUES (?, ?, ?, ?, ?)
            """, (
                assignment_id,
                content_type,
                content_markdown,
                json.dumps(citations) if citations else None,
                model_used
            ))

            # Update assignment flag if study guide
            if content_type == "study_guide":
                cursor.execute(
                    "UPDATE assignments SET study_guide_generated = 1 WHERE id = ?",
                    (assignment_id,)
                )

            return cursor.lastrowid

    def get_generated_content(
        self,
        assignment_id: int,
        content_type: str
    ) -> Optional[Dict[str, Any]]:
        """Get the most recent generated content of a type."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM generated_content
                WHERE assignment_id = ? AND content_type = ?
                ORDER BY created_at DESC
                LIMIT 1
            """, (assignment_id, content_type))
            row = cursor.fetchone()
            if row:
                result = dict(row)
                if result.get("citations"):
                    result["citations"] = json.loads(result["citations"])
                return result
            return None

    # =========================================================================
    # Cron Job Operations
    # =========================================================================

    def create_cron_job(self, job: Dict[str, Any]) -> int:
        """Create a new cron job."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO cron_jobs (name, job_type, schedule, enabled, config)
                VALUES (?, ?, ?, ?, ?)
            """, (
                job["name"],
                job["job_type"],
                job["schedule"],
                job.get("enabled", True),
                json.dumps(job.get("config")) if job.get("config") else None
            ))
            return cursor.lastrowid

    def get_cron_job(self, job_id: int) -> Optional[Dict[str, Any]]:
        """Get a cron job by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM cron_jobs WHERE id = ?", (job_id,))
            row = cursor.fetchone()
            if row:
                result = dict(row)
                if result.get("config"):
                    result["config"] = json.loads(result["config"])
                return result
            return None

    def get_cron_jobs(self, enabled_only: bool = False) -> List[Dict[str, Any]]:
        """Get all cron jobs."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM cron_jobs"
            if enabled_only:
                query += " WHERE enabled = 1"
            query += " ORDER BY name"

            cursor.execute(query)
            results = []
            for row in cursor.fetchall():
                result = dict(row)
                if result.get("config"):
                    result["config"] = json.loads(result["config"])
                results.append(result)
            return results

    def update_cron_job(self, job_id: int, updates: Dict[str, Any]):
        """Update a cron job."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            set_clauses = []
            params = []

            for key in ["name", "job_type", "schedule", "enabled", "next_run_at"]:
                if key in updates:
                    set_clauses.append(f"{key} = ?")
                    params.append(updates[key])

            if "config" in updates:
                set_clauses.append("config = ?")
                params.append(json.dumps(updates["config"]) if updates["config"] else None)

            if set_clauses:
                params.append(job_id)
                cursor.execute(
                    f"UPDATE cron_jobs SET {', '.join(set_clauses)} WHERE id = ?",
                    params
                )

    def delete_cron_job(self, job_id: int):
        """Delete a cron job."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM cron_jobs WHERE id = ?", (job_id,))

    def update_cron_job_last_run(self, job_id: int):
        """Update the last run timestamp for a job."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE cron_jobs SET last_run_at = ? WHERE id = ?",
                (datetime.utcnow().isoformat(), job_id)
            )

    # =========================================================================
    # Cron Job Runs Operations
    # =========================================================================

    def create_job_run(self, job_id: int) -> int:
        """Create a new job run record."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO cron_job_runs (job_id, status, started_at)
                VALUES (?, 'running', ?)
            """, (job_id, datetime.utcnow().isoformat()))
            return cursor.lastrowid

    def complete_job_run(
        self,
        run_id: int,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ):
        """Mark a job run as complete."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE cron_job_runs
                SET status = ?, completed_at = ?, result = ?, error = ?
                WHERE id = ?
            """, (
                status,
                datetime.utcnow().isoformat(),
                json.dumps(result) if result else None,
                error,
                run_id
            ))

    def get_job_runs(
        self,
        job_id: Optional[int] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get job run history."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM cron_job_runs"
            params = []

            if job_id:
                query += " WHERE job_id = ?"
                params.append(job_id)

            query += " ORDER BY started_at DESC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            results = []
            for row in cursor.fetchall():
                result = dict(row)
                if result.get("result"):
                    result["result"] = json.loads(result["result"])
                results.append(result)
            return results

    # =========================================================================
    # Calendar Events Operations
    # =========================================================================

    def upsert_calendar_event(self, event: Dict[str, Any]) -> int:
        """Insert or update a calendar event."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            canvas_event_id = event.get("canvas_event_id")

            if canvas_event_id:
                cursor.execute(
                    "SELECT id FROM calendar_events WHERE canvas_event_id = ?",
                    (canvas_event_id,)
                )
                existing = cursor.fetchone()
            else:
                existing = None

            now = datetime.utcnow().isoformat()

            if existing:
                cursor.execute("""
                    UPDATE calendar_events SET
                        title = ?,
                        description = ?,
                        start_at = ?,
                        end_at = ?,
                        event_type = ?,
                        context_code = ?,
                        html_url = ?,
                        last_synced_at = ?
                    WHERE canvas_event_id = ?
                """, (
                    event["title"],
                    event.get("description"),
                    event["start_at"],
                    event.get("end_at"),
                    event.get("event_type", "event"),
                    event.get("context_code"),
                    event.get("html_url"),
                    now,
                    canvas_event_id
                ))
                return existing["id"]
            else:
                cursor.execute("""
                    INSERT INTO calendar_events (
                        canvas_event_id, title, description, start_at, end_at,
                        event_type, context_code, html_url, last_synced_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    canvas_event_id,
                    event["title"],
                    event.get("description"),
                    event["start_at"],
                    event.get("end_at"),
                    event.get("event_type", "event"),
                    event.get("context_code"),
                    event.get("html_url"),
                    now
                ))
                return cursor.lastrowid

    def get_calendar_events(
        self,
        start_date: str,
        end_date: str
    ) -> List[Dict[str, Any]]:
        """Get calendar events in a date range."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM calendar_events
                WHERE start_at >= ? AND start_at <= ?
                ORDER BY start_at ASC
            """, (start_date, end_date))
            return [dict(row) for row in cursor.fetchall()]
