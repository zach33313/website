#!/usr/bin/env python3
"""
Vectorization CLI Tool

CLI tool for adding documents to the RAG vector database.

Usage:
    python vectorize.py --add ./docs/resume.md
    python vectorize.py --add-dir ./portfolio_content/
    python vectorize.py --list
    python vectorize.py --clear
    python vectorize.py --query "What experience does Zach have?"
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

# Load environment variables
load_dotenv()

from config import get_settings
from services.embedding_service import EmbeddingService
from services.vector_db import VectorDBService
from utils.text_splitter import split_text, count_tokens

console = Console()


def parse_document(file_path: Path) -> str:
    """Parse a document and return its text content."""
    suffix = file_path.suffix.lower()

    if suffix in [".txt", ".md"]:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif suffix == ".json":
        import json
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Convert JSON to readable text
            if isinstance(data, dict):
                return json.dumps(data, indent=2)
            elif isinstance(data, list):
                return "\n\n".join(json.dumps(item, indent=2) for item in data)
            return str(data)
    elif suffix == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            text_parts = []
            for page in reader.pages:
                text_parts.append(page.extract_text())
            return "\n\n".join(text_parts)
        except ImportError:
            console.print("[red]pypdf not installed. Install with: pip install pypdf[/red]")
            sys.exit(1)
    else:
        console.print(f"[yellow]Unsupported file type: {suffix}[/yellow]")
        return None


def add_document(file_path: str, settings, vector_db: VectorDBService) -> int:
    """Add a single document to the vector database."""
    path = Path(file_path)

    if not path.exists():
        console.print(f"[red]File not found: {file_path}[/red]")
        return 0

    console.print(f"[blue]Processing: {path.name}[/blue]")

    # Parse document
    text = parse_document(path)
    if not text:
        return 0

    # Count tokens
    total_tokens = count_tokens(text)
    console.print(f"  Total tokens: {total_tokens}")

    # Split into chunks
    chunks = split_text(
        text,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap
    )

    console.print(f"  Chunks created: {len(chunks)}")

    # Prepare documents and metadata
    documents = [chunk["text"] for chunk in chunks]
    metadatas = [
        {
            "source": path.name,
            "source_path": str(path),
            "chunk_index": chunk["index"],
            "char_start": chunk["char_start"],
            "char_end": chunk["char_end"],
            "token_count": chunk["token_count"]
        }
        for chunk in chunks
    ]
    ids = [f"{path.stem}_{chunk['index']}" for chunk in chunks]

    # Add to vector database
    vector_db.add_documents(documents, metadatas, ids)

    console.print(f"  [green]Added {len(chunks)} chunks to database[/green]")
    return len(chunks)


def add_directory(dir_path: str, settings, vector_db: VectorDBService) -> int:
    """Add all documents from a directory to the vector database."""
    path = Path(dir_path)

    if not path.exists():
        console.print(f"[red]Directory not found: {dir_path}[/red]")
        return 0

    if not path.is_dir():
        console.print(f"[red]Not a directory: {dir_path}[/red]")
        return 0

    # Find all supported files
    extensions = [".txt", ".md", ".json", ".pdf"]
    files = []
    for ext in extensions:
        files.extend(path.rglob(f"*{ext}"))

    if not files:
        console.print(f"[yellow]No supported files found in {dir_path}[/yellow]")
        return 0

    console.print(f"[blue]Found {len(files)} files to process[/blue]")

    total_chunks = 0
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Processing files...", total=len(files))

        for file_path in files:
            chunks_added = add_document(str(file_path), settings, vector_db)
            total_chunks += chunks_added
            progress.advance(task)

    console.print(f"\n[green]Total chunks added: {total_chunks}[/green]")
    return total_chunks


def list_documents(vector_db: VectorDBService):
    """List all documents in the vector database."""
    info = vector_db.get_collection_info()
    console.print(f"\n[bold]Collection: {info['name']}[/bold]")
    console.print(f"Total documents: {info['count']}")
    console.print(f"Path: {info['path']}")

    if info['count'] > 0:
        all_docs = vector_db.get_all_documents()

        # Group by source
        sources: Dict[str, int] = {}
        for meta in all_docs.get("metadatas", []):
            if meta:
                source = meta.get("source", "unknown")
                sources[source] = sources.get(source, 0) + 1

        if sources:
            console.print("\n[bold]Documents by source:[/bold]")
            table = Table()
            table.add_column("Source")
            table.add_column("Chunks", justify="right")

            for source, count in sorted(sources.items()):
                table.add_row(source, str(count))

            console.print(table)


def query_documents(query: str, vector_db: VectorDBService, settings):
    """Query the vector database and show results."""
    console.print(f"\n[bold]Query:[/bold] {query}")

    results = vector_db.query(query, n_results=settings.retrieval_k)

    if not results["documents"]:
        console.print("[yellow]No results found[/yellow]")
        return

    console.print(f"\n[bold]Top {len(results['documents'])} results:[/bold]")

    for i, (doc, meta, dist) in enumerate(zip(
        results["documents"],
        results["metadatas"],
        results["distances"]
    ), 1):
        similarity = round(1 - dist, 3)
        source = meta.get("source", "unknown") if meta else "unknown"

        console.print(f"\n[cyan]Result {i}[/cyan] (similarity: {similarity})")
        console.print(f"Source: {source}")
        console.print(f"Content: {doc[:200]}...")


def clear_database(vector_db: VectorDBService):
    """Clear all documents from the vector database."""
    info = vector_db.get_collection_info()

    if info['count'] == 0:
        console.print("[yellow]Database is already empty[/yellow]")
        return

    confirm = console.input(
        f"[red]This will delete {info['count']} documents. Continue? (y/N): [/red]"
    )

    if confirm.lower() == 'y':
        vector_db.delete_all()
        console.print("[green]Database cleared successfully[/green]")
    else:
        console.print("Cancelled")


def main():
    parser = argparse.ArgumentParser(
        description="Vectorization CLI Tool for RAG database"
    )

    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--add",
        metavar="FILE",
        help="Add a single document to the database"
    )
    group.add_argument(
        "--add-dir",
        metavar="DIR",
        help="Add all documents from a directory"
    )
    group.add_argument(
        "--list",
        action="store_true",
        help="List all documents in the database"
    )
    group.add_argument(
        "--query",
        metavar="TEXT",
        help="Query the database and show results"
    )
    group.add_argument(
        "--clear",
        action="store_true",
        help="Clear all documents from the database"
    )

    args = parser.parse_args()

    # Initialize services
    settings = get_settings()

    console.print("[blue]Initializing services...[/blue]")
    embedding_service = EmbeddingService(settings)
    vector_db = VectorDBService(settings, embedding_service)
    console.print("[green]Services initialized[/green]\n")

    # Execute command
    if args.add:
        add_document(args.add, settings, vector_db)
    elif args.add_dir:
        add_directory(args.add_dir, settings, vector_db)
    elif args.list:
        list_documents(vector_db)
    elif args.query:
        query_documents(args.query, vector_db, settings)
    elif args.clear:
        clear_database(vector_db)


if __name__ == "__main__":
    main()
