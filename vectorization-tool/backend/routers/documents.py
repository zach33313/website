"""Document upload and parsing endpoints."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List

from services.document_parser import parse_document, get_supported_formats


router = APIRouter()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and parse a single document.

    Returns parsed text and metadata.
    """
    try:
        content = await file.read()
        result = parse_document(content, file.filename)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")


@router.post("/upload/batch")
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload and parse multiple documents.

    Returns list of parsed documents.
    """
    results = []
    errors = []

    for file in files:
        try:
            content = await file.read()
            result = parse_document(content, file.filename)
            results.append(result)
        except Exception as e:
            errors.append({
                "filename": file.filename,
                "error": str(e)
            })

    return {
        "documents": results,
        "errors": errors,
        "total": len(files),
        "successful": len(results),
        "failed": len(errors)
    }


@router.post("/parse-text")
async def parse_text(data: dict):
    """
    Parse raw text input.

    Returns parsed text with metadata.
    """
    text = data.get("text", "")
    filename = data.get("filename", "input.txt")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # Count stats
    lines = text.split('\n')
    words = text.split()

    return {
        "filename": filename,
        "content": text,
        "metadata": {
            "file_type": "txt",
            "char_count": len(text),
            "word_count": len(words),
            "line_count": len(lines)
        }
    }


@router.get("/formats")
async def get_formats():
    """Get list of supported file formats."""
    return {
        "formats": get_supported_formats()
    }
