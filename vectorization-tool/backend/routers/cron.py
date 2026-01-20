"""Cron jobs API router."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field


router = APIRouter()


# Request/Response Models
class JobConfigBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    job_type: str = Field(..., description="Type of job (e.g., 'sync_assignments')")
    schedule: str = Field(..., description="Cron expression (e.g., '0 6 * * *')")
    enabled: bool = Field(default=True)
    config: Optional[dict] = Field(default=None, description="Job-specific configuration")


class CreateJobRequest(JobConfigBase):
    pass


class UpdateJobRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    job_type: Optional[str] = None
    schedule: Optional[str] = None
    enabled: Optional[bool] = None
    config: Optional[dict] = None


class JobResponse(BaseModel):
    id: int
    name: str
    job_type: str
    schedule: str
    enabled: bool
    config: Optional[dict]
    last_run_at: Optional[str]
    next_run_at: Optional[str]
    is_scheduled: bool = False


class JobRunResponse(BaseModel):
    id: int
    job_id: int
    status: str
    started_at: str
    completed_at: Optional[str]
    result: Optional[dict]
    error: Optional[str]


class RunJobResponse(BaseModel):
    status: str
    run_id: int
    result: Optional[dict] = None
    error: Optional[str] = None


class JobTypesResponse(BaseModel):
    job_types: List[str]


# Helper functions
def _get_scheduler(request: Request):
    """Get scheduler service from app state."""
    scheduler = getattr(request.app.state, 'scheduler', None)
    if not scheduler:
        raise HTTPException(
            status_code=503,
            detail="Scheduler service not available"
        )
    return scheduler


# Endpoints
@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs(request: Request):
    """List all cron jobs."""
    try:
        scheduler = _get_scheduler(request)
        jobs = scheduler.get_jobs()
        return jobs
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs", response_model=JobResponse)
async def create_job(
    request: Request,
    job_request: CreateJobRequest
):
    """Create a new cron job."""
    try:
        scheduler = _get_scheduler(request)

        job_data = {
            "name": job_request.name,
            "job_type": job_request.job_type,
            "schedule": job_request.schedule,
            "enabled": job_request.enabled,
            "config": job_request.config
        }

        job_id = scheduler.create_job(job_data)
        return scheduler.get_job(job_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/types", response_model=JobTypesResponse)
async def get_job_types(request: Request):
    """Get available job types."""
    try:
        scheduler = _get_scheduler(request)
        return JobTypesResponse(job_types=scheduler.get_available_job_types())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(
    request: Request,
    job_id: int
):
    """Get a cron job by ID."""
    try:
        scheduler = _get_scheduler(request)
        job = scheduler.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/jobs/{job_id}", response_model=JobResponse)
async def update_job(
    request: Request,
    job_id: int,
    updates: UpdateJobRequest
):
    """Update a cron job."""
    try:
        scheduler = _get_scheduler(request)

        # Check job exists
        if not scheduler.get_job(job_id):
            raise HTTPException(status_code=404, detail="Job not found")

        # Build updates dict
        update_data = {}
        if updates.name is not None:
            update_data["name"] = updates.name
        if updates.job_type is not None:
            update_data["job_type"] = updates.job_type
        if updates.schedule is not None:
            update_data["schedule"] = updates.schedule
        if updates.enabled is not None:
            update_data["enabled"] = updates.enabled
        if updates.config is not None:
            update_data["config"] = updates.config

        if update_data:
            scheduler.update_job(job_id, update_data)

        return scheduler.get_job(job_id)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{job_id}")
async def delete_job(
    request: Request,
    job_id: int
):
    """Delete a cron job."""
    try:
        scheduler = _get_scheduler(request)

        if not scheduler.get_job(job_id):
            raise HTTPException(status_code=404, detail="Job not found")

        scheduler.delete_job(job_id)
        return {"status": "deleted", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/run", response_model=RunJobResponse)
async def run_job(
    request: Request,
    job_id: int
):
    """Trigger a job manually."""
    try:
        scheduler = _get_scheduler(request)

        result = await scheduler.run_job_now(job_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/enable")
async def enable_job(
    request: Request,
    job_id: int
):
    """Enable a cron job."""
    try:
        scheduler = _get_scheduler(request)

        if not scheduler.get_job(job_id):
            raise HTTPException(status_code=404, detail="Job not found")

        scheduler.enable_job(job_id)
        return {"status": "enabled", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/disable")
async def disable_job(
    request: Request,
    job_id: int
):
    """Disable a cron job."""
    try:
        scheduler = _get_scheduler(request)

        if not scheduler.get_job(job_id):
            raise HTTPException(status_code=404, detail="Job not found")

        scheduler.disable_job(job_id)
        return {"status": "disabled", "job_id": job_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}/history", response_model=List[JobRunResponse])
async def get_job_history(
    request: Request,
    job_id: int,
    limit: int = 50
):
    """Get execution history for a job."""
    try:
        scheduler = _get_scheduler(request)

        if not scheduler.get_job(job_id):
            raise HTTPException(status_code=404, detail="Job not found")

        runs = scheduler.get_job_history(job_id, limit=limit)
        return runs
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs", response_model=List[JobRunResponse])
async def get_recent_runs(
    request: Request,
    limit: int = 50
):
    """Get recent job runs across all jobs."""
    try:
        scheduler = _get_scheduler(request)
        runs = scheduler.get_recent_runs(limit=limit)
        return runs
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
