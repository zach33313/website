"""RAG API endpoints."""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
import json

from config import get_settings, Settings
from services.vector_db import VectorDBService
from services.llm_service import LLMService
from services.rag_service import RAGService


router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# Request/Response models
class Message(BaseModel):
    """Chat message model."""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=10000)


class AskRequest(BaseModel):
    """Request model for asking questions."""
    question: str = Field(..., min_length=1, max_length=1000)
    chat_history: Optional[List[Message]] = Field(default=None, max_length=20)


class AskResponse(BaseModel):
    """Response model for questions."""
    response: str
    sources: List[Dict[str, Any]]


class SourcesResponse(BaseModel):
    """Response model for source retrieval."""
    sources: List[Dict[str, Any]]


class CollectionInfoResponse(BaseModel):
    """Response model for collection information."""
    name: str
    count: int
    path: str


# Dependency to get RAG service
def get_rag_service(request: Request) -> RAGService:
    """Get RAG service from app state."""
    settings = request.app.state.settings
    vector_db = request.app.state.vector_db
    llm_service = LLMService(settings)
    return RAGService(settings, vector_db, llm_service)


def get_vector_db(request: Request) -> VectorDBService:
    """Get vector DB service from app state."""
    return request.app.state.vector_db


@router.post("/ask", response_model=AskResponse)
@limiter.limit("10/minute")
async def ask_question(
    request: Request,
    body: AskRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Ask a question and get a RAG-powered response.

    Rate limited to 10 requests per minute per IP.
    """
    try:
        # Convert chat history to list of dicts if provided
        chat_history = None
        if body.chat_history:
            chat_history = [msg.model_dump() for msg in body.chat_history]

        result = rag_service.query(
            question=body.question,
            chat_history=chat_history
        )

        return AskResponse(
            response=result["response"],
            sources=result["sources"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask/stream")
@limiter.limit("10/minute")
async def ask_question_stream(
    request: Request,
    body: AskRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Ask a question and get a streaming RAG-powered response.

    Returns Server-Sent Events (SSE) for real-time streaming.
    Rate limited to 10 requests per minute per IP.
    """
    async def generate():
        try:
            # Convert chat history
            chat_history = None
            if body.chat_history:
                chat_history = [msg.model_dump() for msg in body.chat_history]

            # Get sources first
            sources = rag_service.get_sources(body.question)
            yield f"data: {json.dumps({'type': 'sources', 'data': sources})}\n\n"

            # Stream response
            async for chunk in rag_service.query_stream(
                question=body.question,
                chat_history=chat_history
            ):
                yield f"data: {json.dumps({'type': 'chunk', 'data': chunk})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.post("/sources", response_model=SourcesResponse)
async def get_sources(
    request: Request,
    body: AskRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    """
    Get the sources that would be retrieved for a question without generating a response.
    Useful for testing retrieval quality.
    """
    sources = rag_service.get_sources(body.question)
    return SourcesResponse(sources=sources)


@router.get("/collection", response_model=CollectionInfoResponse)
async def get_collection_info(
    vector_db: VectorDBService = Depends(get_vector_db)
):
    """Get information about the vector database collection."""
    info = vector_db.get_collection_info()
    return CollectionInfoResponse(**info)


@router.delete("/collection")
async def clear_collection(
    request: Request,
    vector_db: VectorDBService = Depends(get_vector_db)
):
    """Clear all documents from the collection. Use with caution."""
    settings = get_settings()
    if settings.environment != "development":
        raise HTTPException(
            status_code=403,
            detail="This endpoint is only available in development mode"
        )

    vector_db.delete_all()
    return {"message": "Collection cleared successfully"}
