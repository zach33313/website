"""Assignments API router."""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.database_service import DatabaseService
from services.assignment_service import AssignmentService
from services.generation_service import GenerationService


router = APIRouter()


# Request/Response Models
class SyncRequest(BaseModel):
    course_ids: Optional[List[int]] = Field(
        default=None,
        description="Course IDs to sync. If not provided, syncs favorited courses."
    )
    favorites_only: bool = Field(
        default=True,
        description="Only sync from favorited courses. Set to false for all courses."
    )


class SyncResponse(BaseModel):
    total_synced: int
    new_assignments: int
    updated_assignments: int
    courses_processed: int
    errors: List[str]


class AssignmentResponse(BaseModel):
    id: int
    canvas_assignment_id: int
    course_id: int
    course_name: str
    name: str
    description: Optional[str]
    due_at: Optional[str]
    points_possible: Optional[float]
    submission_types: Optional[str]
    html_url: Optional[str]
    last_synced_at: Optional[str]
    chunks_generated: bool
    study_guide_generated: bool


class ChunkResponse(BaseModel):
    chunk_id: str
    content: str
    filename: str
    relevance_score: float
    metadata: dict


class ProcessChunksRequest(BaseModel):
    collection_name: str = Field(default="canvas_materials")
    embedding_model: str = Field(default="text-embedding-3-large")
    n_results: int = Field(default=10, ge=1, le=50)


class GenerateRequest(BaseModel):
    model: Optional[str] = Field(default=None, description="LLM model to use")
    max_context_tokens: int = Field(default=8000, ge=1000, le=32000)


class GeneratedContentResponse(BaseModel):
    id: int
    assignment_id: int
    content_type: str
    content_markdown: str
    citations: Optional[List[str]]
    model_used: Optional[str]
    created_at: str


class GenerationResultResponse(BaseModel):
    content_markdown: str
    citations: List[dict]
    model_used: str
    token_usage: dict


# Helper functions
def _get_db(request: Request) -> DatabaseService:
    settings = request.app.state.settings
    return DatabaseService(db_path=getattr(settings, 'db_path', './data/canvas_tracker.db'))


def _get_assignment_service(request: Request) -> AssignmentService:
    settings = request.app.state.settings
    db = _get_db(request)
    return AssignmentService(
        db=db,
        canvas_api_url=settings.canvas_api_url,
        canvas_api_token=settings.canvas_api_token,
        openai_api_key=settings.openai_api_key,
        chroma_persist_dir=getattr(settings, 'chroma_persist_dir', './canvas_chroma_db')
    )


def _get_generation_service(request: Request) -> GenerationService:
    settings = request.app.state.settings
    db = _get_db(request)
    assignment_service = _get_assignment_service(request)
    return GenerationService(
        db=db,
        assignment_service=assignment_service,
        openai_api_key=settings.openai_api_key
    )


# Endpoints
@router.get("/", response_model=List[AssignmentResponse])
async def list_assignments(
    request: Request,
    course_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100
):
    """List assignments with optional filters."""
    try:
        service = _get_assignment_service(request)
        assignments = service.get_assignments(
            course_id=course_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
        return assignments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming", response_model=List[AssignmentResponse])
async def get_upcoming_assignments(
    request: Request,
    days: int = 7
):
    """Get assignments due in the next N days."""
    try:
        service = _get_assignment_service(request)
        return service.get_upcoming_assignments(days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    request: Request,
    assignment_id: int
):
    """Get a single assignment by ID."""
    try:
        service = _get_assignment_service(request)
        assignment = service.get_assignment(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return assignment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync", response_model=SyncResponse)
async def sync_assignments(
    request: Request,
    sync_request: Optional[SyncRequest] = None
):
    """Sync assignments from Canvas (favorited courses only by default)."""
    try:
        service = _get_assignment_service(request)
        course_ids = sync_request.course_ids if sync_request else None
        favorites_only = sync_request.favorites_only if sync_request else True
        result = service.sync_assignments(
            course_ids=course_ids,
            favorites_only=favorites_only
        )
        return SyncResponse(
            total_synced=result.total_synced,
            new_assignments=result.new_assignments,
            updated_assignments=result.updated_assignments,
            courses_processed=result.courses_processed,
            errors=result.errors
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assignment_id}/chunks", response_model=List[ChunkResponse])
async def get_assignment_chunks(
    request: Request,
    assignment_id: int
):
    """Get relevant knowledge chunks for an assignment."""
    try:
        service = _get_assignment_service(request)
        chunks = service.get_cached_chunks(assignment_id)
        return [
            ChunkResponse(
                chunk_id=c.chunk_id,
                content=c.content,
                filename=c.filename,
                relevance_score=c.relevance_score,
                metadata=c.metadata
            )
            for c in chunks
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{assignment_id}/process", response_model=List[ChunkResponse])
async def process_assignment_chunks(
    request: Request,
    assignment_id: int,
    process_request: ProcessChunksRequest = None
):
    """Find and cache relevant chunks for an assignment."""
    try:
        service = _get_assignment_service(request)
        req = process_request or ProcessChunksRequest()

        chunks = service.find_relevant_chunks(
            assignment_id=assignment_id,
            collection_name=req.collection_name,
            embedding_model=req.embedding_model,
            n_results=req.n_results,
            save_to_db=True
        )

        return [
            ChunkResponse(
                chunk_id=c.chunk_id,
                content=c.content,
                filename=c.filename,
                relevance_score=c.relevance_score,
                metadata=c.metadata
            )
            for c in chunks
        ]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assignment_id}/study-guide")
async def get_study_guide(
    request: Request,
    assignment_id: int
):
    """Get cached study guide for an assignment."""
    try:
        service = _get_generation_service(request)
        content = service.get_study_guide(assignment_id)
        if not content:
            raise HTTPException(status_code=404, detail="No study guide found")
        return content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{assignment_id}/study-guide/generate", response_model=GenerationResultResponse)
async def generate_study_guide(
    request: Request,
    assignment_id: int,
    generate_request: GenerateRequest = None
):
    """Generate a new study guide for an assignment."""
    try:
        service = _get_generation_service(request)
        req = generate_request or GenerateRequest()

        result = service.generate_study_guide(
            assignment_id=assignment_id,
            model=req.model,
            max_context_tokens=req.max_context_tokens,
            save_to_db=True
        )

        return GenerationResultResponse(
            content_markdown=result.content_markdown,
            citations=result.citations,
            model_used=result.model_used,
            token_usage=result.token_usage
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{assignment_id}/solution")
async def get_solution(
    request: Request,
    assignment_id: int
):
    """Get cached solution for an assignment (nuclear option)."""
    try:
        service = _get_generation_service(request)
        content = service.get_solution(assignment_id)
        if not content:
            raise HTTPException(status_code=404, detail="No solution found")
        return content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{assignment_id}/solution/generate", response_model=GenerationResultResponse)
async def generate_solution(
    request: Request,
    assignment_id: int,
    generate_request: GenerateRequest = None
):
    """
    Generate a solution attempt for an assignment (nuclear option).

    WARNING: This generates complete solutions. Use responsibly.
    """
    try:
        service = _get_generation_service(request)
        req = generate_request or GenerateRequest()

        result = service.generate_solution(
            assignment_id=assignment_id,
            model=req.model,
            max_context_tokens=req.max_context_tokens,
            save_to_db=True
        )

        return GenerationResultResponse(
            content_markdown=result.content_markdown,
            citations=result.citations,
            model_used=result.model_used,
            token_usage=result.token_usage
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
