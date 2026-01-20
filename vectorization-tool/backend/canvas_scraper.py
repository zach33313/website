#!/usr/bin/env python3
"""Canvas LMS scraper for vectorizing course materials."""

import os
import sys
from pathlib import Path
from typing import List, Optional

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table
from rich.panel import Panel
from dotenv import load_dotenv

# Add the backend directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from services.canvas_client import CanvasClient, CanvasConfig, CanvasFile
from services.file_tracker import FileTracker
from services.batch_service import BatchService, BatchConfig
from services.markdown_converter import get_supported_formats

# Load environment variables
load_dotenv()

console = Console()


def get_canvas_client() -> CanvasClient:
    """Create Canvas client from environment."""
    api_url = os.getenv("CANVAS_API_URL")
    api_token = os.getenv("CANVAS_API_TOKEN")

    if not api_url or not api_token:
        console.print("[red]Error:[/red] CANVAS_API_URL and CANVAS_API_TOKEN required in .env")
        sys.exit(1)

    return CanvasClient(CanvasConfig(api_url=api_url.rstrip("/"), api_token=api_token))


@click.group()
@click.version_option(version="2.0.0")
def cli():
    """Canvas LMS Scraper v2 - Deep recursive file discovery and vectorization.

    Scrapes lecture slides, PDFs, and documents from Canvas LMS
    and stores them as vectors for easy retrieval.
    """
    pass


@cli.command()
@click.argument("courses", nargs=-1, required=True)
@click.option("--collection", "-c", default="canvas_materials", help="ChromaDB collection name")
@click.option("--db-path", "-d", default="./canvas_chroma_db", help="ChromaDB directory")
@click.option("--download-dir", default="./canvas_downloads", help="Download directory")
@click.option("--model", "-m", default="sentence-transformers/all-MiniLM-L6-v2", help="Embedding model")
@click.option("--strategy", "-s", default="recursive",
              type=click.Choice(["recursive", "fixed_char", "sentence", "paragraph", "semantic"]))
@click.option("--chunk-size", default=512, help="Target chunk size")
@click.option("--include-assignments", is_flag=True, help="Include assignment files")
@click.option("--force", "-f", is_flag=True, help="Re-process already processed files")
@click.option("--yes", "-y", is_flag=True, help="Skip confirmation")
@click.option("--keep-downloads/--no-keep-downloads", default=True)
def scrape(courses, collection, db_path, download_dir, model, strategy, chunk_size,
           include_assignments, force, yes, keep_downloads):
    """Scrape and vectorize materials from Canvas courses.

    COURSES can be course IDs or search terms (course codes/names).

    Examples:

        # Scrape by course codes
        python canvas_scraper.py scrape CS5100 DS4400 MATH2341

        # Use OpenAI embeddings with semantic chunking
        python canvas_scraper.py scrape DS4400 --model text-embedding-3-large --strategy semantic

        # Force re-process all files
        python canvas_scraper.py scrape CS5100 --force

        # Include assignment files
        python canvas_scraper.py scrape CS5100 --include-assignments
    """
    canvas = get_canvas_client()
    tracker = FileTracker()
    batch_service = BatchService(openai_api_key=os.getenv("OPENAI_API_KEY"))

    batch_config = BatchConfig(
        chunking_strategy=strategy,
        chunk_size=chunk_size,
        chunk_overlap=50,
        embedding_model=model,
        collection_name=collection,
        persist_directory=db_path,
        skip_existing=not force
    )

    console.print(Panel.fit(
        f"[bold]Canvas Scraper v2[/bold]\n"
        f"Courses: {', '.join(courses)}\n"
        f"Collection: {collection}\n"
        f"Model: {model}\n"
        f"Strategy: {strategy}\n"
        f"Include Assignments: {include_assignments}\n"
        f"Force Re-process: {force}",
        title="Configuration"
    ))

    # Resolve courses
    console.print("\n[bold]Resolving courses...[/bold]")
    resolved_courses = []

    for course_input in courses:
        if course_input.isdigit():
            try:
                course = canvas.get_course(int(course_input))
                resolved_courses.append(course)
                console.print(f"  ✓ Found: {course.get('name', course_input)}")
            except Exception as e:
                console.print(f"  ✗ Course ID {course_input} not found")
        else:
            matches = canvas.search_courses([course_input])
            if matches:
                for match in matches:
                    resolved_courses.append(match)
                    console.print(f"  ✓ Found: {match.get('name')} ({match.get('course_code')})")
            else:
                console.print(f"  ✗ No courses found matching '{course_input}'")

    if not resolved_courses:
        console.print("\n[red]No courses found. Exiting.[/red]")
        sys.exit(1)

    # Deduplicate
    seen_ids = set()
    unique_courses = []
    for c in resolved_courses:
        if c["id"] not in seen_ids:
            seen_ids.add(c["id"])
            unique_courses.append(c)

    console.print(f"\n[bold]Discovering files in {len(unique_courses)} courses...[/bold]")

    # Discover all files
    all_files: List[CanvasFile] = []

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), console=console) as progress:
        task = progress.add_task("Scanning...", total=len(unique_courses))

        for course in unique_courses:
            course_id = course["id"]
            course_name = course.get("name", f"Course {course_id}")

            files = canvas.discover_all_files(
                course_id,
                include_assignments=include_assignments,
                progress_callback=lambda msg: progress.update(task, description=msg)
            )
            all_files.extend(files)
            progress.advance(task)

    console.print(f"\n[bold]Found {len(all_files)} total files[/bold]")

    if not all_files:
        console.print("[yellow]No supported files found.[/yellow]")
        sys.exit(0)

    # Check which files need processing
    files_to_process = []
    files_to_skip = []

    for f in all_files:
        if force or not tracker.is_processed(str(f.id), collection, f.modified_at):
            files_to_process.append(f)
        else:
            files_to_skip.append(f)

    console.print(f"  New/updated files: {len(files_to_process)}")
    console.print(f"  Already processed: {len(files_to_skip)}")

    if not files_to_process:
        console.print("\n[green]All files already processed![/green]")
        _show_stats(tracker, collection)
        return

    # Show files to process
    table = Table(title=f"Files to Process ({len(files_to_process)})")
    table.add_column("Course", style="cyan", max_width=25)
    table.add_column("File", style="white", max_width=35)
    table.add_column("Source", style="dim", max_width=20)
    table.add_column("Size", style="green")

    for f in files_to_process[:20]:
        table.add_row(
            f.course_name[:25],
            f.display_name[:35],
            f.source[:20],
            f"{f.size / 1024:.1f} KB"
        )

    if len(files_to_process) > 20:
        table.add_row("...", f"... and {len(files_to_process) - 20} more", "", "")

    console.print(table)

    if not yes and not click.confirm("\nProceed with download and vectorization?"):
        console.print("Cancelled.")
        return

    # Download and process files
    Path(download_dir).mkdir(parents=True, exist_ok=True)

    successful = 0
    failed = 0
    total_chunks = 0

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console
    ) as progress:
        task = progress.add_task("Processing...", total=len(files_to_process))

        for canvas_file in files_to_process:
            progress.update(task, description=f"Downloading {canvas_file.display_name[:40]}...")

            # Download
            local_path = canvas.download_file(canvas_file, download_dir)

            if not local_path:
                failed += 1
                progress.advance(task)
                continue

            progress.update(task, description=f"Vectorizing {canvas_file.display_name[:40]}...")

            # Process
            result = batch_service.process_file(local_path, batch_config)

            if result.success:
                successful += 1
                total_chunks += result.chunks_created

                # Track the file
                tracker.mark_processed(
                    file_id=str(canvas_file.id),
                    filename=canvas_file.display_name,
                    course_id=str(canvas_file.course_id),
                    course_name=canvas_file.course_name,
                    source=canvas_file.source,
                    collection_name=collection,
                    chunk_count=result.chunks_created,
                    file_size=canvas_file.size,
                    canvas_modified_at=canvas_file.modified_at
                )
            else:
                failed += 1
                if result.error and "already exists" not in result.error:
                    console.print(f"\n[dim red]Failed: {canvas_file.display_name}: {result.error}[/dim red]")

            progress.advance(task)

    # Summary
    summary = Table(title="Processing Summary")
    summary.add_column("Metric", style="cyan")
    summary.add_column("Value", style="green")

    summary.add_row("Files Processed", str(successful))
    summary.add_row("Files Failed", str(failed))
    summary.add_row("Files Skipped", str(len(files_to_skip)))
    summary.add_row("Total Chunks Created", str(total_chunks))
    summary.add_row("Collection", collection)

    console.print(summary)

    # Show total stats
    _show_stats(tracker, collection)

    if not keep_downloads:
        import shutil
        shutil.rmtree(download_dir, ignore_errors=True)
        console.print("[dim]Cleaned up downloads[/dim]")

    console.print(f"\n[green]Done![/green]")
    console.print(f"Search: python canvas_scraper.py search \"your query\" -c {collection} -m {model}")


@cli.command()
@click.option("--favorites", "-f", is_flag=True, help="Show only favorites")
def list_courses(favorites):
    """List all available courses."""
    canvas = get_canvas_client()

    console.print("[bold]Fetching courses...[/bold]")

    courses = canvas.get_courses(favorites_only=favorites)

    if not courses:
        console.print("[yellow]No courses found.[/yellow]")
        return

    title = f"{'Favorite ' if favorites else ''}Courses ({len(courses)})"
    table = Table(title=title)
    table.add_column("ID", style="dim")
    table.add_column("Code", style="cyan")
    table.add_column("Name", style="white")

    for course in sorted(courses, key=lambda c: c.get("name", "")):
        table.add_row(
            str(course.get("id", "")),
            course.get("course_code", "")[:20],
            course.get("name", "Unknown")[:50]
        )

    console.print(table)


@cli.command()
@click.argument("course")
@click.option("--include-assignments", is_flag=True, help="Include assignment files")
def preview(course, include_assignments):
    """Preview what files would be scraped from a course."""
    canvas = get_canvas_client()

    # Resolve course
    if course.isdigit():
        course_id = int(course)
    else:
        matches = canvas.search_courses([course])
        if not matches:
            console.print(f"[red]Course not found: {course}[/red]")
            return
        course_id = matches[0]["id"]

    console.print(f"[bold]Scanning course {course_id}...[/bold]")

    files = canvas.discover_all_files(
        course_id,
        include_assignments=include_assignments,
        progress_callback=console.print
    )

    if not files:
        console.print("[yellow]No files found.[/yellow]")
        return

    # Group by source
    by_source = {}
    for f in files:
        source_type = f.source.split(":")[0]
        by_source.setdefault(source_type, []).append(f)

    console.print(f"\n[bold]Found {len(files)} files:[/bold]")

    for source_type, source_files in sorted(by_source.items()):
        console.print(f"\n[cyan]{source_type}[/cyan] ({len(source_files)} files)")
        for f in source_files[:10]:
            console.print(f"  • {f.display_name} ({f.size / 1024:.1f} KB)")
        if len(source_files) > 10:
            console.print(f"  ... and {len(source_files) - 10} more")


@cli.command()
@click.argument("query")
@click.option("--collection", "-c", default="canvas_materials")
@click.option("--db-path", "-d", default="./canvas_chroma_db")
@click.option("--model", "-m", default="sentence-transformers/all-MiniLM-L6-v2")
@click.option("--results", "-n", default=5)
def search(query, collection, db_path, model, results):
    """Search your vectorized Canvas materials."""
    batch_config = BatchConfig(
        embedding_model=model,
        collection_name=collection,
        persist_directory=db_path
    )

    batch_service = BatchService(openai_api_key=os.getenv("OPENAI_API_KEY"))

    console.print(f"Searching: [bold]{query}[/bold]")

    try:
        result = batch_service.query(query, batch_config, n_results=results)

        if not result["results"]:
            console.print("[yellow]No results found.[/yellow]")
            return

        table = Table(title=f"Results ({result['count']})")
        table.add_column("#", style="dim", width=3)
        table.add_column("File", style="cyan", max_width=30)
        table.add_column("Score", style="green", width=8)
        table.add_column("Content", max_width=50)

        for i, r in enumerate(result["results"], 1):
            filename = r["metadata"].get("filename", "Unknown")
            # Convert distance to similarity score (0-100)
            distance = r.get("distance", 0)
            score = max(0, 100 - distance * 50)  # Rough conversion
            preview = r["content"][:100].replace("\n", " ").strip()
            table.add_row(str(i), filename[:30], f"{score:.0f}", preview + "...")

        console.print(table)

    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")


@cli.command()
@click.option("--collection", "-c", default=None, help="Filter by collection")
def stats(collection):
    """Show statistics about processed files."""
    tracker = FileTracker()
    _show_stats(tracker, collection)


@cli.command()
@click.argument("collection_name")
@click.option("--db-path", "-d", default="./canvas_chroma_db")
@click.option("--yes", "-y", is_flag=True)
def reset(collection_name, db_path, yes):
    """Reset a collection (delete vectors and tracking data)."""
    if not yes and not click.confirm(f"Delete collection '{collection_name}' and tracking data?"):
        console.print("Cancelled.")
        return

    tracker = FileTracker()
    tracker.clear_collection(collection_name)

    batch_service = BatchService()
    batch_service.delete_collection(collection_name, db_path)

    console.print(f"[green]Reset collection '{collection_name}'[/green]")


@cli.command()
def formats():
    """Show supported file formats."""
    formats_info = get_supported_formats()

    console.print("\n[bold]Native Formats[/bold]")
    for ext, desc in sorted(formats_info["native"].items()):
        console.print(f"  {ext:12} {desc}")

    console.print("\n[bold]Convertible Formats[/bold] (code → markdown)")
    for ext, desc in sorted(formats_info["convertible"].items()):
        console.print(f"  {ext:12} {desc}")

    console.print(f"\n[dim]Total: {len(formats_info['all_extensions'])} formats[/dim]")


def _show_stats(tracker: FileTracker, collection: Optional[str]):
    """Display statistics."""
    stats = tracker.get_stats(collection)

    console.print(f"\n[bold]{'Collection: ' + collection if collection else 'All Collections'}[/bold]")
    console.print(f"  Files: {stats['total_files']}")
    console.print(f"  Chunks: {stats['total_chunks']}")
    console.print(f"  Size: {stats['total_size_mb']} MB")
    console.print(f"  Courses: {stats['courses']}")


if __name__ == "__main__":
    cli()
