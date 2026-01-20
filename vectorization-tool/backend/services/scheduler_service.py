"""Scheduler service for managing cron jobs with APScheduler."""

import logging
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.memory import MemoryJobStore

from services.database_service import DatabaseService


logger = logging.getLogger(__name__)


class SchedulerService:
    """Service for managing cron jobs with APScheduler."""

    # Job type handlers - maps job_type to handler function
    _job_handlers: Dict[str, Callable] = {}

    def __init__(self, db: DatabaseService):
        self.db = db
        self.scheduler = AsyncIOScheduler(
            jobstores={"default": MemoryJobStore()},
            job_defaults={
                "coalesce": True,  # Combine multiple missed executions into one
                "max_instances": 1,  # Only one instance of each job at a time
                "misfire_grace_time": 3600  # 1 hour grace time for misfires
            }
        )
        self._handlers: Dict[str, Callable] = {}

    def register_handler(self, job_type: str, handler: Callable):
        """Register a handler function for a job type."""
        self._handlers[job_type] = handler
        logger.info(f"Registered handler for job type: {job_type}")

    def start(self):
        """Start the scheduler and load jobs from database."""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler started")
            self._load_jobs_from_db()

    def shutdown(self, wait: bool = True):
        """Shutdown the scheduler."""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=wait)
            logger.info("Scheduler shutdown")

    def _load_jobs_from_db(self):
        """Load enabled jobs from database and schedule them."""
        jobs = self.db.get_cron_jobs(enabled_only=True)

        for job in jobs:
            try:
                self._schedule_job(job)
            except Exception as e:
                logger.error(f"Failed to schedule job {job['name']}: {e}")

    def _schedule_job(self, job: Dict[str, Any]):
        """Schedule a job using APScheduler."""
        job_id = f"cron_job_{job['id']}"

        # Remove existing job if present
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)

        if not job.get("enabled", True):
            return

        handler = self._handlers.get(job["job_type"])
        if not handler:
            logger.warning(f"No handler registered for job type: {job['job_type']}")
            return

        # Parse cron expression
        try:
            trigger = CronTrigger.from_crontab(job["schedule"])
        except Exception as e:
            logger.error(f"Invalid cron expression for job {job['name']}: {e}")
            return

        # Schedule the job
        self.scheduler.add_job(
            func=self._execute_job,
            trigger=trigger,
            id=job_id,
            name=job["name"],
            kwargs={"job_id": job["id"]},
            replace_existing=True
        )

        # Update next run time in database
        next_run = trigger.get_next_fire_time(None, datetime.now())
        if next_run:
            self.db.update_cron_job(job["id"], {"next_run_at": next_run.isoformat()})

        logger.info(f"Scheduled job: {job['name']} ({job['schedule']})")

    async def _execute_job(self, job_id: int):
        """Execute a job and record the result."""
        job = self.db.get_cron_job(job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return

        handler = self._handlers.get(job["job_type"])
        if not handler:
            logger.error(f"No handler for job type: {job['job_type']}")
            return

        # Create run record
        run_id = self.db.create_job_run(job_id)
        logger.info(f"Executing job: {job['name']} (run_id: {run_id})")

        try:
            # Execute handler
            if callable(handler):
                result = await handler(job.get("config", {}))
            else:
                result = {"error": "Handler is not callable"}

            # Mark as completed
            self.db.complete_job_run(run_id, "completed", result=result)
            self.db.update_cron_job_last_run(job_id)

            logger.info(f"Job completed: {job['name']}")

        except Exception as e:
            # Mark as failed
            self.db.complete_job_run(run_id, "failed", error=str(e))
            logger.error(f"Job failed: {job['name']} - {e}")

        # Update next run time
        scheduled_job = self.scheduler.get_job(f"cron_job_{job_id}")
        if scheduled_job and scheduled_job.next_run_time:
            self.db.update_cron_job(
                job_id,
                {"next_run_at": scheduled_job.next_run_time.isoformat()}
            )

    # =========================================================================
    # Job Management API
    # =========================================================================

    def create_job(self, job_data: Dict[str, Any]) -> int:
        """Create a new cron job."""
        # Validate cron expression
        try:
            CronTrigger.from_crontab(job_data["schedule"])
        except Exception as e:
            raise ValueError(f"Invalid cron expression: {e}")

        # Validate job type
        if job_data["job_type"] not in self._handlers:
            raise ValueError(f"Unknown job type: {job_data['job_type']}")

        job_id = self.db.create_cron_job(job_data)

        # Schedule if enabled
        job = self.db.get_cron_job(job_id)
        if job and job.get("enabled", True):
            self._schedule_job(job)

        return job_id

    def update_job(self, job_id: int, updates: Dict[str, Any]):
        """Update a cron job."""
        # Validate cron expression if provided
        if "schedule" in updates:
            try:
                CronTrigger.from_crontab(updates["schedule"])
            except Exception as e:
                raise ValueError(f"Invalid cron expression: {e}")

        self.db.update_cron_job(job_id, updates)

        # Reschedule job
        job = self.db.get_cron_job(job_id)
        if job:
            self._schedule_job(job)

    def delete_job(self, job_id: int):
        """Delete a cron job."""
        # Remove from scheduler
        scheduler_job_id = f"cron_job_{job_id}"
        if self.scheduler.get_job(scheduler_job_id):
            self.scheduler.remove_job(scheduler_job_id)

        # Remove from database
        self.db.delete_cron_job(job_id)

    def enable_job(self, job_id: int):
        """Enable a cron job."""
        self.db.update_cron_job(job_id, {"enabled": True})
        job = self.db.get_cron_job(job_id)
        if job:
            self._schedule_job(job)

    def disable_job(self, job_id: int):
        """Disable a cron job."""
        self.db.update_cron_job(job_id, {"enabled": False})

        # Remove from scheduler
        scheduler_job_id = f"cron_job_{job_id}"
        if self.scheduler.get_job(scheduler_job_id):
            self.scheduler.remove_job(scheduler_job_id)

    async def run_job_now(self, job_id: int) -> Dict[str, Any]:
        """Manually trigger a job execution."""
        job = self.db.get_cron_job(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        handler = self._handlers.get(job["job_type"])
        if not handler:
            raise ValueError(f"No handler for job type: {job['job_type']}")

        # Create run record
        run_id = self.db.create_job_run(job_id)

        try:
            result = await handler(job.get("config", {}))
            self.db.complete_job_run(run_id, "completed", result=result)
            self.db.update_cron_job_last_run(job_id)
            return {"status": "completed", "run_id": run_id, "result": result}

        except Exception as e:
            self.db.complete_job_run(run_id, "failed", error=str(e))
            return {"status": "failed", "run_id": run_id, "error": str(e)}

    def get_job(self, job_id: int) -> Optional[Dict[str, Any]]:
        """Get a cron job by ID."""
        job = self.db.get_cron_job(job_id)
        if job:
            # Add scheduler info
            scheduler_job = self.scheduler.get_job(f"cron_job_{job_id}")
            if scheduler_job:
                job["is_scheduled"] = True
                if scheduler_job.next_run_time:
                    job["next_run_at"] = scheduler_job.next_run_time.isoformat()
            else:
                job["is_scheduled"] = False
        return job

    def get_jobs(self) -> List[Dict[str, Any]]:
        """Get all cron jobs."""
        jobs = self.db.get_cron_jobs()

        # Add scheduler info
        for job in jobs:
            scheduler_job = self.scheduler.get_job(f"cron_job_{job['id']}")
            if scheduler_job:
                job["is_scheduled"] = True
                if scheduler_job.next_run_time:
                    job["next_run_at"] = scheduler_job.next_run_time.isoformat()
            else:
                job["is_scheduled"] = False

        return jobs

    def get_job_history(self, job_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get execution history for a job."""
        return self.db.get_job_runs(job_id=job_id, limit=limit)

    def get_recent_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent job runs across all jobs."""
        return self.db.get_job_runs(limit=limit)

    def get_available_job_types(self) -> List[str]:
        """Get list of registered job types."""
        return list(self._handlers.keys())
