"""Export endpoints."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from services.export_service import ExportService
import json


router = APIRouter()
export_service = ExportService()


class ExportRequest(BaseModel):
    """Request for exporting data."""
    chunks: List[Dict[str, Any]] = Field(..., min_length=1)
    embeddings: List[List[float]] = Field(default=[])
    format: str = Field(default="json", pattern="^(chromadb|pinecone|qdrant|json|csv)$")
    collection_name: str = Field(default="documents")
    namespace: str = Field(default="default")
    include_embeddings: bool = Field(default=True)
    include_text: bool = Field(default=True)


class ConfigExportRequest(BaseModel):
    """Request for exporting configuration."""
    chunking_config: Dict[str, Any] = Field(default={})
    embedding_config: Dict[str, Any] = Field(default={})


@router.post("/")
async def export_data(request: ExportRequest):
    """
    Export chunks and embeddings to specified format.

    Returns formatted data or file download.
    """
    try:
        # Validate embeddings match chunks if provided
        if request.embeddings and len(request.embeddings) != len(request.chunks):
            raise HTTPException(
                status_code=400,
                detail=f"Embedding count ({len(request.embeddings)}) doesn't match chunk count ({len(request.chunks)})"
            )

        if request.format == "chromadb":
            result = export_service.export_chromadb(
                chunks=request.chunks,
                embeddings=request.embeddings,
                collection_name=request.collection_name
            )
        elif request.format == "pinecone":
            result = export_service.export_pinecone(
                chunks=request.chunks,
                embeddings=request.embeddings,
                namespace=request.namespace
            )
        elif request.format == "qdrant":
            result = export_service.export_qdrant(
                chunks=request.chunks,
                embeddings=request.embeddings,
                collection_name=request.collection_name
            )
        elif request.format == "json":
            result = export_service.export_json(
                chunks=request.chunks,
                embeddings=request.embeddings,
                include_embeddings=request.include_embeddings
            )
        elif request.format == "csv":
            csv_content = export_service.export_csv(
                chunks=request.chunks,
                include_text=request.include_text
            )
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename={request.collection_name}.csv"
                }
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unknown format: {request.format}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/download")
async def download_export(request: ExportRequest):
    """
    Export and download as file.

    Returns file download.
    """
    try:
        if request.embeddings and len(request.embeddings) != len(request.chunks):
            raise HTTPException(
                status_code=400,
                detail=f"Embedding count doesn't match chunk count"
            )

        if request.format == "csv":
            content = export_service.export_csv(
                chunks=request.chunks,
                include_text=request.include_text
            )
            media_type = "text/csv"
            filename = f"{request.collection_name}.csv"
        else:
            if request.format == "chromadb":
                data = export_service.export_chromadb(
                    chunks=request.chunks,
                    embeddings=request.embeddings,
                    collection_name=request.collection_name
                )
            elif request.format == "pinecone":
                data = export_service.export_pinecone(
                    chunks=request.chunks,
                    embeddings=request.embeddings,
                    namespace=request.namespace
                )
            elif request.format == "qdrant":
                data = export_service.export_qdrant(
                    chunks=request.chunks,
                    embeddings=request.embeddings,
                    collection_name=request.collection_name
                )
            else:
                data = export_service.export_json(
                    chunks=request.chunks,
                    embeddings=request.embeddings,
                    include_embeddings=request.include_embeddings
                )

            content = json.dumps(data, indent=2)
            media_type = "application/json"
            filename = f"{request.collection_name}.json"

        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@router.post("/config")
async def export_config(request: ConfigExportRequest):
    """
    Export configuration for reproducibility.

    Returns configuration JSON.
    """
    return export_service.export_config(
        chunking_config=request.chunking_config,
        embedding_config=request.embedding_config
    )


@router.get("/formats")
async def get_export_formats():
    """Get available export formats."""
    return {
        "formats": [
            {
                "id": "chromadb",
                "name": "ChromaDB",
                "description": "Format for ChromaDB vector database"
            },
            {
                "id": "pinecone",
                "name": "Pinecone",
                "description": "Format for Pinecone vector database"
            },
            {
                "id": "qdrant",
                "name": "Qdrant",
                "description": "Format for Qdrant vector database"
            },
            {
                "id": "json",
                "name": "JSON",
                "description": "Generic JSON export"
            },
            {
                "id": "csv",
                "name": "CSV",
                "description": "CSV export (without embeddings)"
            }
        ]
    }
