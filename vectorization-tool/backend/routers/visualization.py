"""Visualization endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

from services.visualization_service import VisualizationService


router = APIRouter()
viz_service = VisualizationService()


class ReduceRequest(BaseModel):
    """Request for dimensionality reduction."""
    embeddings: List[List[float]] = Field(..., min_length=2)
    algorithm: Optional[Literal["umap", "tsne", "pca"]] = Field(default=None)
    method: Optional[Literal["umap", "tsne", "pca"]] = Field(default=None)  # Alias for frontend
    n_components: int = Field(default=2, ge=2, le=3)
    # UMAP params
    n_neighbors: int = Field(default=15, ge=2, le=200)
    min_dist: float = Field(default=0.1, ge=0.0, le=1.0)
    # t-SNE params
    perplexity: float = Field(default=30.0, ge=5.0, le=100.0)
    learning_rate: float = Field(default=200.0, ge=10.0, le=1000.0)
    n_iter: int = Field(default=1000, ge=250, le=5000)
    # Chunk previews for response
    chunk_previews: Optional[List[str]] = None


class SimilarityRequest(BaseModel):
    """Request for similarity calculation."""
    embeddings: List[List[float]] = Field(..., min_length=2)
    metric: Literal["cosine", "euclidean", "dot"] = Field(default="cosine")
    chunk_ids: Optional[List[str]] = None


class NeighborsRequest(BaseModel):
    """Request for finding nearest neighbors."""
    embeddings: List[List[float]] = Field(..., min_length=2)
    query_index: int = Field(..., ge=0)
    k: int = Field(default=5, ge=1, le=50)
    metric: Literal["cosine", "euclidean", "dot"] = Field(default="cosine")
    chunk_previews: Optional[List[str]] = None


class ClusterRequest(BaseModel):
    """Request for clustering."""
    embeddings: List[List[float]] = Field(..., min_length=2)
    algorithm: Literal["kmeans", "dbscan"] = Field(default="kmeans")
    n_clusters: int = Field(default=5, ge=2, le=50)
    # DBSCAN params
    eps: float = Field(default=0.5, ge=0.01, le=5.0)
    min_samples: int = Field(default=5, ge=1, le=50)
    chunk_ids: Optional[List[str]] = None


class DuplicatesRequest(BaseModel):
    """Request for finding duplicates."""
    embeddings: List[List[float]] = Field(..., min_length=2)
    threshold: float = Field(default=0.95, ge=0.5, le=1.0)


@router.post("/reduce")
async def reduce_dimensions(request: ReduceRequest):
    """
    Reduce embedding dimensions for visualization.

    Returns 2D or 3D coordinates.
    """
    try:
        # Use method if algorithm not provided (frontend compatibility)
        algorithm = request.algorithm or request.method or "umap"

        result = viz_service.reduce_dimensions(
            embeddings=request.embeddings,
            algorithm=algorithm,
            n_components=request.n_components,
            n_neighbors=request.n_neighbors,
            min_dist=request.min_dist,
            perplexity=request.perplexity,
            learning_rate=request.learning_rate,
            n_iter=request.n_iter
        )

        # Transform to frontend-expected format
        coordinates = result.get("coordinates", [])
        points = []
        for i, coord in enumerate(coordinates):
            point = {
                "x": float(coord[0]) if len(coord) > 0 else 0.0,
                "y": float(coord[1]) if len(coord) > 1 else 0.0,
                "chunk_id": f"chunk_{i}",
                "chunk_index": i,
                "preview": request.chunk_previews[i] if request.chunk_previews and i < len(request.chunk_previews) else ""
            }
            # Always include z for 3D, default to 0 if not present
            if request.n_components == 3:
                point["z"] = float(coord[2]) if len(coord) > 2 else 0.0
            points.append(point)

        return {"points": points}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reduction failed: {str(e)}")


@router.post("/similarity")
async def calculate_similarity(request: SimilarityRequest):
    """
    Calculate pairwise similarity matrix.

    Returns similarity matrix.
    """
    try:
        result = viz_service.calculate_similarity_matrix(
            embeddings=request.embeddings,
            metric=request.metric
        )
        # Add chunk_ids to response (generate if not provided)
        if request.chunk_ids:
            result["chunk_ids"] = request.chunk_ids
        else:
            result["chunk_ids"] = [f"chunk_{i}" for i in range(len(request.embeddings))]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Similarity calculation failed: {str(e)}")


@router.post("/neighbors")
async def find_neighbors(request: NeighborsRequest):
    """
    Find k nearest neighbors for a given embedding.

    Returns list of neighbors with similarities.
    """
    try:
        if request.query_index >= len(request.embeddings):
            raise HTTPException(
                status_code=400,
                detail=f"query_index {request.query_index} out of range"
            )

        neighbors = viz_service.find_nearest_neighbors(
            embeddings=request.embeddings,
            query_index=request.query_index,
            k=request.k,
            metric=request.metric
        )

        # Add previews if provided
        if request.chunk_previews:
            for neighbor in neighbors:
                idx = neighbor.get("chunk_index", neighbor.get("index", 0))
                if idx < len(request.chunk_previews):
                    neighbor["preview"] = request.chunk_previews[idx]

        return {
            "query_index": request.query_index,
            "neighbors": neighbors
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Neighbor search failed: {str(e)}")


@router.post("/cluster")
async def cluster_embeddings(request: ClusterRequest):
    """
    Cluster embeddings.

    Returns cluster labels and metadata.
    """
    try:
        result = viz_service.detect_clusters(
            embeddings=request.embeddings,
            algorithm=request.algorithm,
            n_clusters=request.n_clusters,
            eps=request.eps,
            min_samples=request.min_samples
        )
        # Add chunk_ids to response
        if request.chunk_ids:
            result["chunk_ids"] = request.chunk_ids
        else:
            result["chunk_ids"] = [f"chunk_{i}" for i in range(len(request.embeddings))]
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {str(e)}")


@router.post("/duplicates")
async def find_duplicates(request: DuplicatesRequest):
    """
    Find near-duplicate embeddings.

    Returns list of duplicate pairs.
    """
    try:
        duplicates = viz_service.find_duplicates(
            embeddings=request.embeddings,
            threshold=request.threshold
        )

        return {
            "duplicates": duplicates,
            "count": len(duplicates),
            "threshold": request.threshold
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Duplicate detection failed: {str(e)}")
