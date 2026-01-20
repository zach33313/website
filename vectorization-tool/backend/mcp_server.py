#!/usr/bin/env python3
"""MCP Server for Canvas Vector Store.

This server exposes the vectorized Canvas materials to AI models
via the Model Context Protocol (MCP).
"""

import os
import sys
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Add the backend directory to path
sys.path.insert(0, str(Path(__file__).parent))

from services.batch_service import BatchService, BatchConfig
from services.file_tracker import FileTracker

load_dotenv()


@dataclass
class MCPConfig:
    """MCP Server configuration."""
    # Use absolute path based on this file's location
    db_path: str = str(Path(__file__).parent / "canvas_chroma_db")
    default_collection: str = "canvas_materials"
    default_model: str = "text-embedding-3-large"  # OpenAI large model for consistency
    max_results: int = 20


# Initialize the MCP server
server = Server("canvas-vector-store")
config = MCPConfig()
batch_service = BatchService(openai_api_key=os.getenv("OPENAI_API_KEY"))
tracker = FileTracker()


@server.list_tools()
async def list_tools() -> list[Tool]:
    """Return available MCP tools."""
    return [
        Tool(
            name="search_canvas",
            description="Search through vectorized Canvas course materials (lecture slides, PDFs, documents). Use this to find relevant information from your classes.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query - describe what you're looking for"
                    },
                    "num_results": {
                        "type": "integer",
                        "description": "Number of results to return (default: 5, max: 20)",
                        "default": 5
                    },
                    "collection": {
                        "type": "string",
                        "description": "Collection to search (default: canvas_materials)",
                        "default": "canvas_materials"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="list_collections",
            description="List all available vector collections",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="get_collection_info",
            description="Get detailed information about a specific collection",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {
                        "type": "string",
                        "description": "Collection name"
                    }
                },
                "required": ["collection"]
            }
        ),
        Tool(
            name="get_file_content",
            description="Get the full content of chunks from a specific file",
            inputSchema={
                "type": "object",
                "properties": {
                    "filename": {
                        "type": "string",
                        "description": "The filename to retrieve chunks from"
                    },
                    "collection": {
                        "type": "string",
                        "description": "Collection name (default: canvas_materials)",
                        "default": "canvas_materials"
                    }
                },
                "required": ["filename"]
            }
        ),
        Tool(
            name="get_course_files",
            description="List all vectorized files from a specific course",
            inputSchema={
                "type": "object",
                "properties": {
                    "course_name": {
                        "type": "string",
                        "description": "Part of the course name to filter by (e.g., 'EECE2310', 'Machine Learning')"
                    },
                    "collection": {
                        "type": "string",
                        "description": "Collection name (default: canvas_materials)",
                        "default": "canvas_materials"
                    }
                },
                "required": ["course_name"]
            }
        ),
        Tool(
            name="get_stats",
            description="Get statistics about the vector store",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {
                        "type": "string",
                        "description": "Collection name (optional, returns all if not specified)"
                    }
                }
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Execute a tool and return results."""
    import json

    try:
        if name == "search_canvas":
            result = _search(
                query=arguments["query"],
                num_results=arguments.get("num_results", 5),
                collection=arguments.get("collection", config.default_collection)
            )
        elif name == "list_collections":
            result = _list_collections()
        elif name == "get_collection_info":
            result = _get_collection_info(arguments["collection"])
        elif name == "get_file_content":
            result = _get_file_content(
                filename=arguments["filename"],
                collection=arguments.get("collection", config.default_collection)
            )
        elif name == "get_course_files":
            result = _get_course_files(
                course_name=arguments["course_name"],
                collection=arguments.get("collection", config.default_collection)
            )
        elif name == "get_stats":
            result = _get_stats(arguments.get("collection"))
        else:
            result = {"error": f"Unknown tool: {name}"}
    except Exception as e:
        result = {"error": str(e)}

    return [TextContent(type="text", text=json.dumps(result, indent=2))]


def _extract_course_from_path(file_path: str) -> str:
    """Extract course name from file path."""
    if not file_path:
        return "Unknown"
    # File paths are like: canvas_downloads/COURSE_NAME_FOLDER/filename.pdf
    parts = file_path.split("/")
    for part in parts:
        # Look for course folder (usually contains course code like EECE2310, DS4420, etc.)
        if any(code in part.upper() for code in ["EECE", "DS44", "PHIL", "CS", "MATH"]):
            # Clean up the folder name
            return part.replace("_", " ")[:60]
    return "Unknown"


def _search(query: str, num_results: int = 5, collection: str = "canvas_materials") -> dict:
    """Search the vector store."""
    num_results = min(num_results, config.max_results)

    # Determine embedding model from collection metadata
    try:
        collections = batch_service.list_collections(config.db_path)
        coll_info = next((c for c in collections if c["name"] == collection), None)
        if coll_info and coll_info.get("metadata"):
            model = coll_info["metadata"].get("embedding_model", config.default_model)
        else:
            model = config.default_model
    except Exception:
        model = config.default_model

    batch_config = BatchConfig(
        embedding_model=model,
        collection_name=collection,
        persist_directory=config.db_path
    )

    result = batch_service.query(query, batch_config, n_results=num_results)

    # Format results for model consumption
    formatted_results = []
    for r in result.get("results", []):
        file_path = r["metadata"].get("file_path", "")
        course = _extract_course_from_path(file_path)

        formatted_results.append({
            "filename": r["metadata"].get("filename", "Unknown"),
            "course": course,
            "file_path": file_path,
            "content": r["content"],
            "chunk_index": r["metadata"].get("chunk_index", 0),
            "relevance_score": round(r.get("similarity", 0) * 100, 1)
        })

    return {
        "query": query,
        "num_results": len(formatted_results),
        "results": formatted_results
    }


def _list_collections() -> dict:
    """List all collections."""
    collections = batch_service.list_collections(config.db_path)
    return {
        "collections": [
            {
                "name": c["name"],
                "document_count": c["count"],
                "embedding_model": c.get("metadata", {}).get("embedding_model", "unknown")
            }
            for c in collections
        ]
    }


def _get_collection_info(collection: str) -> dict:
    """Get collection details."""
    batch_config = BatchConfig(
        collection_name=collection,
        persist_directory=config.db_path
    )

    info = batch_service.get_collection_info(batch_config)
    stats = tracker.get_stats(collection)

    return {
        "name": info["name"],
        "chunk_count": info["count"],
        "metadata": info.get("metadata", {}),
        "tracked_files": stats["total_files"],
        "total_size_mb": stats["total_size_mb"],
        "courses": stats["courses"]
    }


def _get_file_content(filename: str, collection: str) -> dict:
    """Get all chunks from a specific file."""
    import chromadb
    from chromadb.config import Settings

    client = chromadb.PersistentClient(
        path=config.db_path,
        settings=Settings(anonymized_telemetry=False)
    )

    try:
        coll = client.get_collection(collection)
    except Exception:
        return {"error": f"Collection '{collection}' not found"}

    # Query by filename metadata
    results = coll.get(
        where={"filename": {"$eq": filename}},
        include=["documents", "metadatas"]
    )

    if not results["ids"]:
        # Try partial match
        all_results = coll.get(include=["metadatas"])
        matching_files = [
            m.get("filename") for m in all_results["metadatas"]
            if filename.lower() in m.get("filename", "").lower()
        ]
        if matching_files:
            return {
                "error": f"File not found. Did you mean: {list(set(matching_files))[:5]}"
            }
        return {"error": f"File '{filename}' not found in collection"}

    chunks = []
    for i, doc in enumerate(results["documents"]):
        chunks.append({
            "chunk_index": results["metadatas"][i].get("chunk_index", i),
            "content": doc
        })

    # Sort by chunk index
    chunks.sort(key=lambda x: x["chunk_index"])

    return {
        "filename": filename,
        "chunk_count": len(chunks),
        "chunks": chunks
    }


def _get_course_files(course_name: str, collection: str) -> dict:
    """List files from a course by searching ChromaDB metadata."""
    import chromadb
    from chromadb.config import Settings

    client = chromadb.PersistentClient(
        path=config.db_path,
        settings=Settings(anonymized_telemetry=False)
    )

    try:
        coll = client.get_collection(collection)
    except Exception:
        return {"error": f"Collection '{collection}' not found"}

    # Get all metadata to find files
    all_results = coll.get(include=["metadatas"])

    # Group by filename and extract course from path
    files_info = {}
    for meta in all_results["metadatas"]:
        filename = meta.get("filename", "Unknown")
        file_path = meta.get("file_path", "")
        course = _extract_course_from_path(file_path)

        # Filter by course name
        if course_name.lower() not in course.lower() and course_name.lower() not in file_path.lower():
            continue

        if filename not in files_info:
            files_info[filename] = {
                "filename": filename,
                "course": course,
                "file_path": file_path,
                "chunk_count": 0
            }
        files_info[filename]["chunk_count"] += 1

    matching = list(files_info.values())
    matching.sort(key=lambda x: x["filename"])

    return {
        "course_filter": course_name,
        "file_count": len(matching),
        "files": [
            {
                "filename": f["filename"],
                "course": f["course"],
                "chunks": f["chunk_count"]
            }
            for f in matching
        ]
    }


def _get_stats(collection: Optional[str] = None) -> dict:
    """Get vector store statistics from ChromaDB."""
    import chromadb
    from chromadb.config import Settings

    client = chromadb.PersistentClient(
        path=config.db_path,
        settings=Settings(anonymized_telemetry=False)
    )

    collections_to_check = []
    if collection:
        try:
            coll = client.get_collection(collection)
            collections_to_check = [coll]
        except Exception:
            return {"error": f"Collection '{collection}' not found"}
    else:
        collections_to_check = client.list_collections()

    total_chunks = 0
    total_files = set()
    courses = set()

    for coll in collections_to_check:
        total_chunks += coll.count()
        # Sample metadata to get file/course info
        results = coll.get(include=["metadatas"])
        for meta in results["metadatas"]:
            filename = meta.get("filename")
            file_path = meta.get("file_path", "")
            if filename:
                total_files.add(filename)
            course = _extract_course_from_path(file_path)
            if course != "Unknown":
                courses.add(course)

    return {
        "collection": collection or "all",
        "files": len(total_files),
        "chunks": total_chunks,
        "courses": list(courses)
    }


async def main():
    """Run the MCP server using stdio transport."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
