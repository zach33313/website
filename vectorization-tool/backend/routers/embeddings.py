"""Embedding endpoints."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional

from services.embedding_service import EmbeddingService, EMBEDDING_MODELS


router = APIRouter()


class EmbedRequest(BaseModel):
    """Request for generating embeddings."""
    texts: List[str] = Field(..., min_length=1, max_length=1000)
    model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")
    dimensions: Optional[int] = None
    normalize: bool = Field(default=True)
    batch_size: int = Field(default=32, ge=1, le=128)


class EmbedChunksRequest(BaseModel):
    """Request for embedding chunks."""
    chunks: List[dict] = Field(..., min_length=1)
    model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")
    dimensions: Optional[int] = None
    normalize: bool = Field(default=True)
    batch_size: int = Field(default=32, ge=1, le=128)


@router.post("/embed")
@router.post("/generate")  # Alias for frontend compatibility
async def embed_texts(request: EmbedRequest, req: Request):
    """
    Generate embeddings for a list of texts.

    Returns embeddings and metadata.
    """
    try:
        # Get OpenAI key from app state if needed
        settings = req.app.state.settings
        embedding_service = EmbeddingService(openai_api_key=settings.openai_api_key)

        result = embedding_service.embed(
            texts=request.texts,
            model=request.model,
            dimensions=request.dimensions,
            normalize=request.normalize,
            batch_size=request.batch_size
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")


@router.post("/embed/chunks")
async def embed_chunks(request: EmbedChunksRequest, req: Request):
    """
    Generate embeddings for chunks.

    Returns chunks with their embeddings.
    """
    try:
        settings = req.app.state.settings
        embedding_service = EmbeddingService(openai_api_key=settings.openai_api_key)

        # Extract texts from chunks
        texts = [chunk.get("text", "") for chunk in request.chunks]

        result = embedding_service.embed(
            texts=texts,
            model=request.model,
            dimensions=request.dimensions,
            normalize=request.normalize,
            batch_size=request.batch_size
        )

        # Combine chunks with embeddings
        chunks_with_embeddings = []
        for i, chunk in enumerate(request.chunks):
            chunk_copy = dict(chunk)
            if i < len(result["embeddings"]):
                chunk_copy["embedding"] = result["embeddings"][i]
            chunks_with_embeddings.append(chunk_copy)

        return {
            "chunks": chunks_with_embeddings,
            "model": result["model"],
            "dimensions": result["dimensions"],
            "count": result["count"]
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")


@router.get("/models")
async def get_models():
    """Get available embedding models."""
    # Transform dict to array format expected by frontend
    models_list = []
    for model_id, info in EMBEDDING_MODELS.items():
        # Create a friendly name from the model ID
        name = model_id.split("/")[-1].replace("-", " ").title()
        if "MiniLM" in model_id:
            name = "MiniLM L6"
        elif "mpnet" in model_id:
            name = "MPNet Base"
        elif "paraphrase" in model_id:
            name = "Paraphrase MiniLM"
        elif "text-embedding-3-small" in model_id:
            name = "OpenAI Small"
        elif "text-embedding-3-large" in model_id:
            name = "OpenAI Large"

        models_list.append({
            "id": model_id,
            "name": name,
            "dimensions": info["dimensions"],
            "max_tokens": info["max_tokens"],
            "description": info["description"]
        })

    return {"models": models_list}


@router.get("/models/{model_id:path}")
async def get_model_info(model_id: str):
    """Get information about a specific model."""
    model_info = EMBEDDING_MODELS.get(model_id)
    if not model_info:
        raise HTTPException(status_code=404, detail=f"Model not found: {model_id}")
    return {
        "model_id": model_id,
        **model_info
    }
