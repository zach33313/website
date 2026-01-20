#!/usr/bin/env python3
"""CLI tool for batch processing files into a vector database."""

import os
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table
from rich.panel import Panel
from dotenv import load_dotenv

# Add the backend directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from services.batch_service import BatchService, BatchConfig
from services.markdown_converter import get_supported_formats

# Load environment variables
load_dotenv()

console = Console()


@click.group()
@click.version_option(version="1.0.0")
def cli():
    """Vectorization Tool - Batch Processing CLI

    Process documents into vector embeddings and store them in ChromaDB.
    """
    pass


@cli.command()
@click.argument("path", type=click.Path(exists=True))
@click.option("--collection", "-c", default="documents", help="Collection name in ChromaDB")
@click.option("--db-path", "-d", default="./chroma_db", help="ChromaDB persistence directory")
@click.option("--model", "-m", default="sentence-transformers/all-MiniLM-L6-v2",
              help="Embedding model to use")
@click.option("--strategy", "-s", default="recursive",
              type=click.Choice(["recursive", "fixed_char", "sentence", "paragraph", "semantic"]),
              help="Chunking strategy")
@click.option("--chunk-size", default=512, help="Target chunk size in characters")
@click.option("--chunk-overlap", default=50, help="Overlap between chunks")
@click.option("--recursive/--no-recursive", default=True, help="Process subdirectories")
@click.option("--skip-existing/--no-skip-existing", default=True, help="Skip already processed files")
def process(path, collection, db_path, model, strategy, chunk_size, chunk_overlap, recursive, skip_existing):
    """Process files or directory into vector database.

    PATH can be a single file or a directory.

    Examples:

        # Process a single file
        python batch.py process ./document.pdf

        # Process a directory
        python batch.py process ./documents/ --collection my_docs

        # Use OpenAI embeddings
        python batch.py process ./docs/ --model text-embedding-3-small

        # Use semantic chunking
        python batch.py process ./docs/ --strategy semantic
    """
    openai_key = os.getenv("OPENAI_API_KEY")

    # Warn if using OpenAI model without key
    if model.startswith("text-embedding") and not openai_key:
        console.print("[red]Error:[/red] OpenAI API key required for OpenAI models.")
        console.print("Set OPENAI_API_KEY in your .env file or environment.")
        sys.exit(1)

    config = BatchConfig(
        chunking_strategy=strategy,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        embedding_model=model,
        collection_name=collection,
        persist_directory=db_path,
        skip_existing=skip_existing
    )

    service = BatchService(openai_api_key=openai_key)

    console.print(Panel.fit(
        f"[bold]Batch Processing[/bold]\n"
        f"Path: {path}\n"
        f"Collection: {collection}\n"
        f"Model: {model}\n"
        f"Strategy: {strategy}",
        title="Configuration"
    ))

    path_obj = Path(path)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console
    ) as progress:

        if path_obj.is_file():
            # Process single file
            task = progress.add_task("Processing file...", total=1)

            def file_callback(msg):
                progress.update(task, description=msg)

            result = service.process_file(str(path_obj), config, progress_callback=file_callback)
            progress.update(task, completed=1)

            # Create a batch result for consistent output
            from services.batch_service import BatchResult
            batch_result = BatchResult(
                total_files=1,
                successful=1 if result.success else 0,
                failed=0 if result.success else 1,
                total_chunks=result.chunks_created,
                total_embeddings=result.embeddings_created,
                results=[result],
                collection_name=collection,
                persist_directory=db_path
            )
        else:
            # Process directory
            files = service._find_files(str(path_obj), recursive)

            if not files:
                console.print("[yellow]No supported files found.[/yellow]")
                console.print(f"Supported extensions: {', '.join(service.SUPPORTED_EXTENSIONS)}")
                sys.exit(0)

            console.print(f"Found [bold]{len(files)}[/bold] files to process")

            task = progress.add_task("Processing files...", total=len(files))

            def dir_callback(msg, current, total):
                progress.update(task, completed=current, description=msg)

            batch_result = service.process_files(files, config, progress_callback=dir_callback)

    # Display results
    _display_results(batch_result)


@cli.command()
@click.argument("query")
@click.option("--collection", "-c", default="documents", help="Collection name")
@click.option("--db-path", "-d", default="./chroma_db", help="ChromaDB directory")
@click.option("--model", "-m", default="sentence-transformers/all-MiniLM-L6-v2", help="Embedding model")
@click.option("--results", "-n", default=5, help="Number of results")
def search(query, collection, db_path, model, results):
    """Search the vector database.

    Examples:

        python batch.py search "machine learning algorithms"

        python batch.py search "API documentation" --collection api_docs -n 10
    """
    openai_key = os.getenv("OPENAI_API_KEY")

    config = BatchConfig(
        embedding_model=model,
        collection_name=collection,
        persist_directory=db_path
    )

    service = BatchService(openai_api_key=openai_key)

    console.print(f"Searching for: [bold]{query}[/bold]")

    try:
        result = service.query(query, config, n_results=results)

        if not result["results"]:
            console.print("[yellow]No results found.[/yellow]")
            return

        table = Table(title=f"Search Results ({result['count']} found)")
        table.add_column("#", style="dim")
        table.add_column("File", style="cyan")
        table.add_column("Similarity", style="green")
        table.add_column("Content Preview")

        for i, r in enumerate(result["results"], 1):
            filename = r["metadata"].get("filename", "Unknown")
            similarity = f"{r['similarity']:.1%}"
            preview = r["content"][:100] + "..." if len(r["content"]) > 100 else r["content"]
            table.add_row(str(i), filename, similarity, preview)

        console.print(table)

    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")
        sys.exit(1)


@cli.command()
@click.option("--db-path", "-d", default="./chroma_db", help="ChromaDB directory")
def list(db_path):
    """List all collections in the database.

    Example:

        python batch.py list
    """
    service = BatchService()

    try:
        collections = service.list_collections(db_path)

        if not collections:
            console.print("[yellow]No collections found.[/yellow]")
            return

        table = Table(title="Collections")
        table.add_column("Name", style="cyan")
        table.add_column("Documents", style="green")
        table.add_column("Model")
        table.add_column("Chunk Strategy")

        for c in collections:
            metadata = c.get("metadata", {})
            table.add_row(
                c["name"],
                str(c["count"]),
                metadata.get("embedding_model", "Unknown"),
                metadata.get("chunking_strategy", "Unknown")
            )

        console.print(table)

    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")
        sys.exit(1)


@cli.command()
@click.argument("collection_name")
@click.option("--db-path", "-d", default="./chroma_db", help="ChromaDB directory")
def info(collection_name, db_path):
    """Get detailed info about a collection.

    Example:

        python batch.py info documents
    """
    service = BatchService()

    config = BatchConfig(
        collection_name=collection_name,
        persist_directory=db_path
    )

    try:
        info = service.get_collection_info(config)

        console.print(Panel.fit(
            f"[bold]Name:[/bold] {info['name']}\n"
            f"[bold]Document Count:[/bold] {info['count']}\n"
            f"[bold]Embedding Model:[/bold] {info['metadata'].get('embedding_model', 'Unknown')}\n"
            f"[bold]Dimensions:[/bold] {info['metadata'].get('dimensions', 'Unknown')}\n"
            f"[bold]Chunking Strategy:[/bold] {info['metadata'].get('chunking_strategy', 'Unknown')}\n"
            f"[bold]Chunk Size:[/bold] {info['metadata'].get('chunk_size', 'Unknown')}\n"
            f"[bold]Chunk Overlap:[/bold] {info['metadata'].get('chunk_overlap', 'Unknown')}",
            title=f"Collection: {collection_name}"
        ))

    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")
        sys.exit(1)


@cli.command()
@click.argument("collection_name")
@click.option("--db-path", "-d", default="./chroma_db", help="ChromaDB directory")
@click.option("--yes", "-y", is_flag=True, help="Skip confirmation")
def delete(collection_name, db_path, yes):
    """Delete a collection.

    Example:

        python batch.py delete old_documents --yes
    """
    if not yes:
        if not click.confirm(f"Delete collection '{collection_name}'?"):
            console.print("Cancelled.")
            return

    service = BatchService()

    if service.delete_collection(collection_name, db_path):
        console.print(f"[green]Deleted collection '{collection_name}'[/green]")
    else:
        console.print(f"[red]Failed to delete collection '{collection_name}'[/red]")
        sys.exit(1)


@cli.command()
def formats():
    """Show all supported file formats.

    Example:

        python batch.py formats
    """
    formats_info = get_supported_formats()

    console.print("\n[bold]Native Formats[/bold] (parsed directly)")
    table = Table()
    table.add_column("Extension", style="cyan")
    table.add_column("Description", style="white")

    for ext, desc in sorted(formats_info["native"].items()):
        table.add_row(ext, desc)
    console.print(table)

    console.print("\n[bold]Convertible Formats[/bold] (converted to markdown)")
    table2 = Table()
    table2.add_column("Extension", style="cyan")
    table2.add_column("Language/Type", style="white")

    # Group by category
    code_exts = ['.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.c', '.cpp', '.h', '.hpp',
                 '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.r', '.rmd',
                 '.sql', '.sh', '.bash', '.lua', '.m', '.jl']
    config_exts = ['.yaml', '.yml', '.toml', '.xml', '.ini', '.cfg', '.conf', '.env']
    web_exts = ['.html', '.htm', '.css', '.scss', '.sass', '.less']
    data_exts = ['.csv', '.tsv', '.ipynb']

    for ext in sorted(formats_info["convertible"].keys()):
        desc = formats_info["convertible"][ext]
        table2.add_row(ext, desc)

    console.print(table2)
    console.print(f"\n[dim]Total: {len(formats_info['all_extensions'])} supported formats[/dim]")


def _display_results(result):
    """Display batch processing results."""
    # Summary table
    summary = Table(title="Processing Summary")
    summary.add_column("Metric", style="cyan")
    summary.add_column("Value", style="green")

    summary.add_row("Total Files", str(result.total_files))
    summary.add_row("Successful", str(result.successful))
    summary.add_row("Failed", str(result.failed))
    summary.add_row("Total Chunks", str(result.total_chunks))
    summary.add_row("Total Embeddings", str(result.total_embeddings))
    summary.add_row("Collection", result.collection_name)
    summary.add_row("Database Path", result.persist_directory)

    console.print(summary)

    # Show failures if any
    failures = [r for r in result.results if not r.success]
    if failures:
        console.print("\n[red]Failed Files:[/red]")
        for f in failures:
            console.print(f"  • {f.filename}: {f.error}")

    # Show skipped if any
    skipped = [r for r in result.results if r.success and r.error == "Skipped - already exists"]
    if skipped:
        console.print(f"\n[yellow]Skipped {len(skipped)} existing files[/yellow]")


if __name__ == "__main__":
    cli()
