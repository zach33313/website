"""Chunking endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional

from services.chunking_service import ChunkingService, count_tokens, get_token_boundaries


router = APIRouter()
chunking_service = ChunkingService()


class ChunkRequest(BaseModel):
    """Request model for chunking."""
    text: str = Field(..., min_length=1)
    strategy: str = Field(default="recursive")
    chunk_size: int = Field(default=450, ge=50, le=4000)
    chunk_overlap: int = Field(default=90, ge=0, le=1000)
    size_metric: str = Field(default="tokens", pattern="^(tokens|characters)$")
    separators: Optional[List[str]] = None
    keep_separator: bool = Field(default=False)


class TokenCountRequest(BaseModel):
    """Request for token counting."""
    text: str


@router.post("/chunk")
async def chunk_text(request: ChunkRequest):
    """
    Chunk text using specified configuration.

    Returns list of chunks with metadata.
    """
    try:
        # Validate overlap is less than chunk size
        if request.chunk_overlap >= request.chunk_size:
            raise HTTPException(
                status_code=400,
                detail="Chunk overlap must be less than chunk size"
            )

        chunks = chunking_service.chunk(
            text=request.text,
            strategy=request.strategy,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            size_metric=request.size_metric,
            separators=request.separators,
            keep_separator=request.keep_separator
        )

        # Calculate statistics
        char_counts = [c["char_count"] for c in chunks]

        return {
            "chunks": chunks,
            "stats": {
                "total_chunks": len(chunks),
                "avg_chunk_size": sum(char_counts) / len(char_counts) if char_counts else 0,
                "min_chunk_size": min(char_counts) if char_counts else 0,
                "max_chunk_size": max(char_counts) if char_counts else 0,
                "total_chars": sum(char_counts)
            }
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chunking failed: {str(e)}")


@router.post("/chunk/preview")
async def preview_chunks(request: ChunkRequest):
    """
    Preview chunk boundaries for visualization.

    Returns segments with chunk assignments and overlap regions.
    """
    try:
        if request.chunk_overlap >= request.chunk_size:
            raise HTTPException(
                status_code=400,
                detail="Chunk overlap must be less than chunk size"
            )

        chunks = chunking_service.chunk(
            text=request.text,
            strategy=request.strategy,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            size_metric=request.size_metric,
            separators=request.separators,
            keep_separator=request.keep_separator
        )

        segments = chunking_service.preview_chunk_boundaries(request.text, chunks)

        return {
            "chunks": chunks,
            "segments": segments,
            "original_length": len(request.text)
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/strategies")
async def get_strategies():
    """Get available chunking strategies."""
    return {
        "strategies": chunking_service.get_strategies()
    }


@router.post("/tokens/count")
async def count_text_tokens(request: TokenCountRequest):
    """Count tokens in text."""
    token_count = count_tokens(request.text)
    char_count = len(request.text)
    word_count = len(request.text.split())

    return {
        "tokens": token_count,
        "characters": char_count,
        "words": word_count,
        "chars_per_token": char_count / token_count if token_count else 0
    }


@router.post("/tokens/boundaries")
async def get_token_bounds(request: TokenCountRequest):
    """Get token boundaries for visualization."""
    boundaries = get_token_boundaries(request.text)
    return {
        "boundaries": boundaries,
        "total_tokens": len(boundaries)
    }
