"""Job handlers for cron jobs."""

from typing import Dict, Any, Callable
import logging

from services.database_service import DatabaseService
from services.assignment_service import AssignmentService
from services.calendar_service import CalendarService
from services.batch_service import BatchService
from services.canvas_client import CanvasClient, CanvasConfig
from config import Settings

logger = logging.getLogger(__name__)


class JobHandlers:
    """Factory class for creating job handlers with proper dependencies."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._db = None

    @property
    def db(self) -> DatabaseService:
        if self._db is None:
            self._db = DatabaseService(
                db_path=getattr(self.settings, 'db_path', './data/canvas_tracker.db')
            )
        return self._db

    def get_handlers(self) -> Dict[str, Callable]:
        """Get all registered job handlers."""
        return {
            "sync_assignments": self.sync_assignments_handler,
            "scrape_materials": self.scrape_materials_handler,
            "process_upcoming": self.process_upcoming_handler,
            "sync_calendar": self.sync_calendar_handler
        }

    async def sync_assignments_handler(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync assignments from Canvas.

        Config options:
            - course_ids: List of course IDs to sync (optional)
            - favorites_only: Only sync favorited courses (default: True)
        """
        logger.info("Running sync_assignments job")

        service = AssignmentService(
            db=self.db,
            canvas_api_url=self.settings.canvas_api_url,
            canvas_api_token=self.settings.canvas_api_token,
            openai_api_key=self.settings.openai_api_key
        )

        config = config or {}
        course_ids = config.get("course_ids")
        favorites_only = config.get("favorites_only", True)
        result = service.sync_assignments(
            course_ids=course_ids,
            favorites_only=favorites_only
        )

        return {
            "total_synced": result.total_synced,
            "new_assignments": result.new_assignments,
            "updated_assignments": result.updated_assignments,
            "courses_processed": result.courses_processed,
            "errors": result.errors
        }

    async def scrape_materials_handler(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Scrape course materials from Canvas and vectorize them.

        Config options:
            - course_ids: List of course IDs to scrape (optional)
            - favorites_only: Only scrape favorited courses (default: True)
            - download_dir: Directory to download files to
            - collection_name: ChromaDB collection name
        """
        logger.info("Running scrape_materials job")

        config = config or {}
        download_dir = config.get("download_dir", "./downloads")
        collection_name = config.get("collection_name", "canvas_materials")
        course_ids = config.get("course_ids")
        favorites_only = config.get("favorites_only", True)

        # Get Canvas client
        canvas_client = CanvasClient(CanvasConfig(
            api_url=self.settings.canvas_api_url,
            api_token=self.settings.canvas_api_token
        ))

        # Get batch service for vectorization
        batch_service = BatchService(openai_api_key=self.settings.openai_api_key)

        # Get courses
        if course_ids:
            courses = [{"id": cid} for cid in course_ids]
        else:
            courses = canvas_client.get_courses(favorites_only=favorites_only)

        total_files = 0
        processed_files = 0
        errors = []

        for course in courses:
            course_id = course["id"]
            course_name = course.get("name", f"Course {course_id}")

            try:
                logger.info(f"Discovering files for {course_name}")

                files = canvas_client.discover_all_files(
                    course_id=course_id,
                    include_assignments=False
                )

                total_files += len(files)

                for canvas_file in files:
                    try:
                        # Download file
                        local_path = canvas_client.download_file(
                            canvas_file,
                            download_dir
                        )

                        if local_path:
                            # Vectorize file
                            from services.batch_service import BatchConfig
                            batch_config = BatchConfig(
                                collection_name=collection_name,
                                persist_directory=getattr(
                                    self.settings, 'chroma_persist_dir', './chroma_db'
                                )
                            )

                            result = batch_service.process_file(
                                local_path,
                                batch_config
                            )

                            if result.success:
                                processed_files += 1

                    except Exception as e:
                        errors.append(f"{canvas_file.display_name}: {str(e)}")

            except Exception as e:
                errors.append(f"Course {course_name}: {str(e)}")

        return {
            "total_files_discovered": total_files,
            "files_processed": processed_files,
            "courses_processed": len(courses),
            "errors": errors
        }

    async def process_upcoming_handler(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Find and cache relevant chunks for upcoming assignments.

        Config options:
            - days: Number of days to look ahead (default: 7)
            - collection_name: ChromaDB collection name
            - n_results: Number of chunks to find per assignment
        """
        logger.info("Running process_upcoming job")

        config = config or {}
        days = config.get("days", 7)
        collection_name = config.get("collection_name", "canvas_materials")
        n_results = config.get("n_results", 10)

        service = AssignmentService(
            db=self.db,
            canvas_api_url=self.settings.canvas_api_url,
            canvas_api_token=self.settings.canvas_api_token,
            openai_api_key=self.settings.openai_api_key,
            chroma_persist_dir=getattr(self.settings, 'chroma_persist_dir', './canvas_chroma_db')
        )

        result = service.process_upcoming_assignments(
            days=days,
            collection_name=collection_name,
            n_results=n_results
        )

        return result

    async def sync_calendar_handler(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sync calendar events from Canvas.

        Config options:
            - days_ahead: Number of days ahead to sync (default: 30)
            - days_behind: Number of days behind to sync (default: 7)
            - context_codes: List of Canvas context codes
        """
        logger.info("Running sync_calendar job")

        config = config or {}
        days_ahead = config.get("days_ahead", 30)
        days_behind = config.get("days_behind", 7)
        context_codes = config.get("context_codes")

        from datetime import datetime, timedelta
        now = datetime.utcnow()
        start_date = (now - timedelta(days=days_behind)).isoformat() + "Z"
        end_date = (now + timedelta(days=days_ahead)).isoformat() + "Z"

        service = CalendarService(
            db=self.db,
            canvas_api_url=self.settings.canvas_api_url,
            canvas_api_token=self.settings.canvas_api_token
        )

        result = service.sync_calendar_events(
            start_date=start_date,
            end_date=end_date,
            context_codes=context_codes
        )

        return {
            "total_synced": result.total_synced,
            "new_events": result.new_events,
            "updated_events": result.updated_events,
            "errors": result.errors
        }
