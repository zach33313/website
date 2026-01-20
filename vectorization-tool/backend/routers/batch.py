"""Batch processing API endpoints."""

import os
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Request, BackgroundTasks
from pydantic import BaseModel, Field

from services.batch_service import BatchService, BatchConfig, BatchResult


router = APIRouter()


class BatchConfigRequest(BaseModel):
    """Configuration for batch processing."""
    chunking_strategy: str = Field(default="recursive", pattern="^(recursive|fixed_char|sentence|paragraph|semantic)$")
    chunk_size: int = Field(default=512, ge=100, le=4000)
    chunk_overlap: int = Field(default=50, ge=0, le=500)
    embedding_model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2")
    embedding_dimensions: Optional[int] = Field(default=None)
    collection_name: str = Field(default="documents", min_length=1, max_length=64)
    persist_directory: str = Field(default="./chroma_db")
    skip_existing: bool = Field(default=True)


class ProcessFilesRequest(BaseModel):
    """Request to process multiple files."""
    file_paths: List[str] = Field(..., min_length=1)
    config: BatchConfigRequest = Field(default_factory=BatchConfigRequest)


class ProcessDirectoryRequest(BaseModel):
    """Request to process a directory."""
    directory: str
    recursive: bool = Field(default=True)
    config: BatchConfigRequest = Field(default_factory=BatchConfigRequest)


class QueryRequest(BaseModel):
    """Request to query the vector database."""
    query: str = Field(..., min_length=1)
    n_results: int = Field(default=5, ge=1, le=100)
    config: BatchConfigRequest = Field(default_factory=BatchConfigRequest)


class ProcessingResultResponse(BaseModel):
    """Response for a single file processing result."""
    filename: str
    success: bool
    chunks_created: int
    embeddings_created: int
    error: Optional[str]
    document_id: Optional[str]


class BatchResultResponse(BaseModel):
    """Response for batch processing."""
    total_files: int
    successful: int
    failed: int
    total_chunks: int
    total_embeddings: int
    collection_name: str
    persist_directory: str
    results: List[ProcessingResultResponse]


def _get_service(request: Request) -> BatchService:
    """Get batch service with API key from settings."""
    settings = request.app.state.settings
    return BatchService(openai_api_key=settings.openai_api_key)


def _config_to_batch(config: BatchConfigRequest) -> BatchConfig:
    """Convert request config to BatchConfig."""
    return BatchConfig(
        chunking_strategy=config.chunking_strategy,
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
        embedding_model=config.embedding_model,
        embedding_dimensions=config.embedding_dimensions,
        collection_name=config.collection_name,
        persist_directory=config.persist_directory,
        skip_existing=config.skip_existing
    )


def _result_to_response(result: BatchResult) -> BatchResultResponse:
    """Convert BatchResult to response model."""
    return BatchResultResponse(
        total_files=result.total_files,
        successful=result.successful,
        failed=result.failed,
        total_chunks=result.total_chunks,
        total_embeddings=result.total_embeddings,
        collection_name=result.collection_name,
        persist_directory=result.persist_directory,
        results=[
            ProcessingResultResponse(
                filename=r.filename,
                success=r.success,
                chunks_created=r.chunks_created,
                embeddings_created=r.embeddings_created,
                error=r.error,
                document_id=r.document_id
            )
            for r in result.results
        ]
    )


@router.post("/process/files", response_model=BatchResultResponse)
async def process_files(request: ProcessFilesRequest, req: Request):
    """
    Process a list of files into the vector database.

    Provide absolute file paths on the server filesystem.
    """
    service = _get_service(req)
    config = _config_to_batch(request.config)

    # Validate all files exist
    for path in request.file_paths:
        if not os.path.isfile(path):
            raise HTTPException(status_code=400, detail=f"File not found: {path}")

    try:
        result = service.process_files(request.file_paths, config)
        return _result_to_response(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/process/directory", response_model=BatchResultResponse)
async def process_directory(request: ProcessDirectoryRequest, req: Request):
    """
    Process all supported files in a directory.

    Supported extensions: .txt, .md, .json, .pdf, .docx
    """
    service = _get_service(req)
    config = _config_to_batch(request.config)

    if not os.path.isdir(request.directory):
        raise HTTPException(status_code=400, detail=f"Directory not found: {request.directory}")

    try:
        result = service.process_directory(
            request.directory,
            config,
            recursive=request.recursive
        )
        return _result_to_response(result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/process/upload", response_model=BatchResultResponse)
async def process_uploaded_files(
    req: Request,
    files: List[UploadFile] = File(...),
    collection_name: str = "documents",
    chunking_strategy: str = "recursive",
    chunk_size: int = 512,
    chunk_overlap: int = 50,
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
    persist_directory: str = "./chroma_db"
):
    """
    Upload and process files directly via multipart form.

    This endpoint accepts file uploads and processes them immediately.
    """
    import tempfile

    service = _get_service(req)
    config = BatchConfig(
        chunking_strategy=chunking_strategy,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        embedding_model=embedding_model,
        collection_name=collection_name,
        persist_directory=persist_directory
    )

    # Save uploaded files to temp directory
    temp_paths = []
    try:
        for file in files:
            # Create temp file with original extension
            suffix = Path(file.filename).suffix if file.filename else ".txt"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                content = await file.read()
                tmp.write(content)
                temp_paths.append((tmp.name, file.filename))

        # Process files
        file_paths = [path for path, _ in temp_paths]
        result = service.process_files(file_paths, config)

        # Update filenames in results to original names
        filename_map = {path: name for path, name in temp_paths}
        for r in result.results:
            original = filename_map.get(
                next((p for p, n in temp_paths if n == r.filename or p.endswith(r.filename)), None),
                r.filename
            )
            # Try to restore original filename
            for path, name in temp_paths:
                if path.endswith(r.filename) or r.filename == os.path.basename(path):
                    r.filename = name
                    break

        return _result_to_response(result)

    finally:
        # Clean up temp files
        for path, _ in temp_paths:
            try:
                os.unlink(path)
            except Exception:
                pass


@router.post("/query")
async def query_database(request: QueryRequest, req: Request):
    """
    Query the vector database for similar documents.

    Returns the most similar chunks to the query text.
    """
    service = _get_service(req)
    config = _config_to_batch(request.config)

    try:
        return service.query(request.query, config, n_results=request.n_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/collections")
async def list_collections(req: Request, persist_directory: str = "./chroma_db"):
    """List all collections in the database."""
    service = _get_service(req)

    try:
        return {"collections": service.list_collections(persist_directory)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list collections: {str(e)}")


@router.get("/collections/{collection_name}")
async def get_collection_info(
    collection_name: str,
    req: Request,
    persist_directory: str = "./chroma_db"
):
    """Get detailed information about a collection."""
    service = _get_service(req)

    config = BatchConfig(
        collection_name=collection_name,
        persist_directory=persist_directory
    )

    try:
        return service.get_collection_info(config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get collection info: {str(e)}")


@router.delete("/collections/{collection_name}")
async def delete_collection(
    collection_name: str,
    req: Request,
    persist_directory: str = "./chroma_db"
):
    """Delete a collection."""
    service = _get_service(req)

    if service.delete_collection(collection_name, persist_directory):
        return {"message": f"Collection '{collection_name}' deleted"}
    else:
        raise HTTPException(status_code=404, detail=f"Collection '{collection_name}' not found")


@router.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats."""
    return {
        "formats": [
            {"extension": ".txt", "description": "Plain text files"},
            {"extension": ".md", "description": "Markdown files"},
            {"extension": ".json", "description": "JSON files"},
            {"extension": ".pdf", "description": "PDF documents"},
            {"extension": ".docx", "description": "Word documents"},
        ]
    }
