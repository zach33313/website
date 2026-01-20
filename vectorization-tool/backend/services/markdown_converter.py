"""Markdown converter for various file types."""

import re
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

# Files that can be parsed directly (no conversion needed)
NATIVE_FORMATS = {
    '.txt': 'Plain text',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.pdf': 'PDF document',
    '.docx': 'Word document',
    '.ppt': 'PowerPoint (legacy)',
    '.pptx': 'PowerPoint',
}

# Files that should be converted to markdown
CONVERTIBLE_FORMATS = {
    # Code files
    '.py': ('python', 'Python'),
    '.js': ('javascript', 'JavaScript'),
    '.ts': ('typescript', 'TypeScript'),
    '.jsx': ('jsx', 'React JSX'),
    '.tsx': ('tsx', 'React TSX'),
    '.java': ('java', 'Java'),
    '.c': ('c', 'C'),
    '.cpp': ('cpp', 'C++'),
    '.h': ('c', 'C Header'),
    '.hpp': ('cpp', 'C++ Header'),
    '.cs': ('csharp', 'C#'),
    '.go': ('go', 'Go'),
    '.rs': ('rust', 'Rust'),
    '.rb': ('ruby', 'Ruby'),
    '.php': ('php', 'PHP'),
    '.swift': ('swift', 'Swift'),
    '.kt': ('kotlin', 'Kotlin'),
    '.scala': ('scala', 'Scala'),
    '.r': ('r', 'R'),
    '.rmd': ('markdown', 'R Markdown'),
    '.sql': ('sql', 'SQL'),
    '.sh': ('bash', 'Shell Script'),
    '.bash': ('bash', 'Bash Script'),
    '.zsh': ('zsh', 'Zsh Script'),
    '.ps1': ('powershell', 'PowerShell'),
    '.yaml': ('yaml', 'YAML'),
    '.yml': ('yaml', 'YAML'),
    '.toml': ('toml', 'TOML'),
    '.xml': ('xml', 'XML'),
    '.html': ('html', 'HTML'),
    '.htm': ('html', 'HTML'),
    '.css': ('css', 'CSS'),
    '.scss': ('scss', 'SCSS'),
    '.sass': ('sass', 'Sass'),
    '.less': ('less', 'Less'),
    '.lua': ('lua', 'Lua'),
    '.perl': ('perl', 'Perl'),
    '.pl': ('perl', 'Perl'),
    '.m': ('matlab', 'MATLAB'),
    '.mat': ('matlab', 'MATLAB'),
    '.jl': ('julia', 'Julia'),
    '.ex': ('elixir', 'Elixir'),
    '.exs': ('elixir', 'Elixir Script'),
    '.erl': ('erlang', 'Erlang'),
    '.hs': ('haskell', 'Haskell'),
    '.clj': ('clojure', 'Clojure'),
    '.lisp': ('lisp', 'Lisp'),
    '.scm': ('scheme', 'Scheme'),
    '.v': ('verilog', 'Verilog'),
    '.vhd': ('vhdl', 'VHDL'),
    '.tex': ('latex', 'LaTeX'),
    '.latex': ('latex', 'LaTeX'),

    # Notebook formats
    '.ipynb': ('jupyter', 'Jupyter Notebook'),

    # Config files
    '.ini': ('ini', 'INI Config'),
    '.cfg': ('ini', 'Config'),
    '.conf': ('conf', 'Config'),
    '.env': ('bash', 'Environment'),
    '.gitignore': ('gitignore', 'Git Ignore'),
    '.dockerignore': ('dockerignore', 'Docker Ignore'),
    'Dockerfile': ('dockerfile', 'Dockerfile'),
    'Makefile': ('makefile', 'Makefile'),
    '.cmake': ('cmake', 'CMake'),

    # Data formats (convert to show structure)
    '.csv': ('csv', 'CSV'),
    '.tsv': ('tsv', 'TSV'),
}

# All supported formats
ALL_SUPPORTED = set(NATIVE_FORMATS.keys()) | set(CONVERTIBLE_FORMATS.keys())


def get_file_category(filename: str) -> Tuple[str, Optional[str], Optional[str]]:
    """
    Determine how to handle a file.

    Returns:
        Tuple of (category, language_hint, description)
        category: 'native', 'convert', or 'unsupported'
    """
    ext = Path(filename).suffix.lower()
    name = Path(filename).name

    # Check for special filenames without extensions
    if name in CONVERTIBLE_FORMATS:
        lang, desc = CONVERTIBLE_FORMATS[name]
        return ('convert', lang, desc)

    if ext in NATIVE_FORMATS:
        return ('native', None, NATIVE_FORMATS[ext])

    if ext in CONVERTIBLE_FORMATS:
        lang, desc = CONVERTIBLE_FORMATS[ext]
        return ('convert', lang, desc)

    return ('unsupported', None, None)


def convert_to_markdown(content: str, filename: str) -> Dict[str, Any]:
    """
    Convert file content to markdown format.

    Args:
        content: File content as string
        filename: Original filename

    Returns:
        Dict with markdown content and metadata
    """
    ext = Path(filename).suffix.lower()
    name = Path(filename).name

    # Get language info
    if name in CONVERTIBLE_FORMATS:
        lang, desc = CONVERTIBLE_FORMATS[name]
    elif ext in CONVERTIBLE_FORMATS:
        lang, desc = CONVERTIBLE_FORMATS[ext]
    else:
        lang, desc = 'text', 'Unknown'

    # Handle special formats
    if ext == '.ipynb':
        return _convert_jupyter(content, filename)
    elif ext == '.rmd':
        return _convert_rmarkdown(content, filename)
    elif ext in {'.csv', '.tsv'}:
        return _convert_tabular(content, filename, ext)
    elif ext in {'.html', '.htm'}:
        return _convert_html(content, filename)
    else:
        return _convert_code(content, filename, lang, desc)


def _convert_code(content: str, filename: str, lang: str, desc: str) -> Dict[str, Any]:
    """Convert code file to markdown with syntax highlighting."""

    # Extract docstrings/comments as description if available
    description = _extract_file_description(content, lang)

    # Build markdown
    lines = [
        f"# {Path(filename).name}",
        "",
        f"**Type:** {desc}",
        "",
    ]

    if description:
        lines.extend([
            "## Description",
            "",
            description,
            "",
        ])

    lines.extend([
        "## Code",
        "",
        f"```{lang}",
        content,
        "```",
    ])

    markdown = "\n".join(lines)

    return {
        "content": markdown,
        "original_filename": filename,
        "converted_from": desc,
        "language": lang,
        "line_count": content.count('\n') + 1,
        "char_count": len(content)
    }


def _extract_file_description(content: str, lang: str) -> Optional[str]:
    """Extract file-level docstring or comment."""

    # Python docstring
    if lang == 'python':
        match = re.match(r'^[\s]*["\'][\"\'][\"\'](.+?)["\'][\"\'][\"\']', content, re.DOTALL)
        if match:
            return match.group(1).strip()
        # Also try single-line docstring
        match = re.match(r'^[\s]*["\'][\"\'][\"\'](.+?)["\'][\"\'][\"\']', content)
        if match:
            return match.group(1).strip()

    # JavaScript/TypeScript JSDoc
    if lang in {'javascript', 'typescript', 'jsx', 'tsx'}:
        match = re.match(r'^[\s]*/\*\*(.+?)\*/', content, re.DOTALL)
        if match:
            # Clean up JSDoc
            doc = match.group(1)
            doc = re.sub(r'^\s*\*\s?', '', doc, flags=re.MULTILINE)
            return doc.strip()

    # C-style block comment
    if lang in {'c', 'cpp', 'java', 'csharp', 'go', 'rust'}:
        match = re.match(r'^[\s]*/\*(.+?)\*/', content, re.DOTALL)
        if match:
            return match.group(1).strip()

    # Shell/Python/Ruby hash comments at start
    if lang in {'bash', 'python', 'ruby', 'r', 'perl'}:
        lines = content.split('\n')
        comment_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('#') and not stripped.startswith('#!'):
                comment_lines.append(stripped[1:].strip())
            elif stripped and not stripped.startswith('#'):
                break
        if comment_lines:
            return '\n'.join(comment_lines)

    return None


def _convert_jupyter(content: str, filename: str) -> Dict[str, Any]:
    """Convert Jupyter notebook to markdown."""
    import json

    try:
        notebook = json.loads(content)
    except json.JSONDecodeError:
        return _convert_code(content, filename, 'json', 'Jupyter Notebook (invalid)')

    cells = notebook.get('cells', [])

    lines = [
        f"# {Path(filename).stem}",
        "",
        "**Type:** Jupyter Notebook",
        "",
    ]

    for i, cell in enumerate(cells):
        cell_type = cell.get('cell_type', 'code')
        source = ''.join(cell.get('source', []))

        if cell_type == 'markdown':
            lines.append(source)
            lines.append("")
        elif cell_type == 'code':
            lines.append(f"### Cell {i + 1}")
            lines.append("")
            lines.append("```python")
            lines.append(source)
            lines.append("```")
            lines.append("")

            # Include outputs if present
            outputs = cell.get('outputs', [])
            for output in outputs:
                if output.get('output_type') == 'stream':
                    text = ''.join(output.get('text', []))
                    if text.strip():
                        lines.append("**Output:**")
                        lines.append("```")
                        lines.append(text[:500])  # Limit output
                        lines.append("```")
                        lines.append("")

    markdown = "\n".join(lines)

    return {
        "content": markdown,
        "original_filename": filename,
        "converted_from": "Jupyter Notebook",
        "language": "jupyter",
        "cell_count": len(cells)
    }


def _convert_rmarkdown(content: str, filename: str) -> Dict[str, Any]:
    """Convert R Markdown to plain markdown."""

    lines = [
        f"# {Path(filename).stem}",
        "",
        "**Type:** R Markdown",
        "",
    ]

    # R Markdown is already mostly markdown, just wrap code chunks properly
    # Convert ```{r ...} to ```r
    converted = re.sub(r'```\{r[^}]*\}', '```r', content)

    # Extract YAML front matter if present
    yaml_match = re.match(r'^---\n(.+?)\n---', content, re.DOTALL)
    if yaml_match:
        yaml_content = yaml_match.group(1)
        lines.append("## Document Info")
        lines.append("")
        lines.append("```yaml")
        lines.append(yaml_content)
        lines.append("```")
        lines.append("")
        # Remove YAML from converted content
        converted = re.sub(r'^---\n.+?\n---\n?', '', converted, flags=re.DOTALL)

    lines.append("## Content")
    lines.append("")
    lines.append(converted)

    markdown = "\n".join(lines)

    return {
        "content": markdown,
        "original_filename": filename,
        "converted_from": "R Markdown",
        "language": "rmarkdown"
    }


def _convert_tabular(content: str, filename: str, ext: str) -> Dict[str, Any]:
    """Convert CSV/TSV to markdown with preview."""

    delimiter = '\t' if ext == '.tsv' else ','
    lines = content.split('\n')

    md_lines = [
        f"# {Path(filename).name}",
        "",
        f"**Type:** {'Tab-separated values' if ext == '.tsv' else 'Comma-separated values'}",
        f"**Rows:** {len(lines)}",
        "",
        "## Preview (first 20 rows)",
        "",
    ]

    # Parse and create markdown table
    preview_lines = lines[:21]  # Header + 20 rows

    if preview_lines:
        # Header
        header = preview_lines[0].split(delimiter)
        md_lines.append("| " + " | ".join(header) + " |")
        md_lines.append("| " + " | ".join(['---'] * len(header)) + " |")

        # Rows
        for row in preview_lines[1:]:
            cells = row.split(delimiter)
            # Truncate long cells
            cells = [c[:50] + '...' if len(c) > 50 else c for c in cells]
            md_lines.append("| " + " | ".join(cells) + " |")

    if len(lines) > 21:
        md_lines.append("")
        md_lines.append(f"*... and {len(lines) - 21} more rows*")

    md_lines.append("")
    md_lines.append("## Raw Data (first 5000 chars)")
    md_lines.append("")
    md_lines.append("```")
    md_lines.append(content[:5000])
    md_lines.append("```")

    markdown = "\n".join(md_lines)

    return {
        "content": markdown,
        "original_filename": filename,
        "converted_from": "CSV" if ext == '.csv' else "TSV",
        "row_count": len(lines)
    }


def _convert_html(content: str, filename: str) -> Dict[str, Any]:
    """Convert HTML to markdown, extracting text content."""

    # Simple HTML to text conversion
    # Remove script and style elements
    text = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)

    # Convert common elements
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<h4[^>]*>(.*?)</h4>', r'#### \1\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<p[^>]*>(.*?)</p>', r'\1\n\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.IGNORECASE)
    text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text, flags=re.IGNORECASE)
    text = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', text, flags=re.IGNORECASE)
    text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text, flags=re.IGNORECASE)
    text = re.sub(r'<i[^>]*>(.*?)</i>', r'*\1*', text, flags=re.IGNORECASE)
    text = re.sub(r'<code[^>]*>(.*?)</code>', r'`\1`', text, flags=re.IGNORECASE)

    # Remove remaining tags
    text = re.sub(r'<[^>]+>', '', text)

    # Clean up whitespace
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
    text = text.strip()

    # Decode HTML entities
    import html
    text = html.unescape(text)

    lines = [
        f"# {Path(filename).name}",
        "",
        "**Type:** HTML (converted to Markdown)",
        "",
        "---",
        "",
        text
    ]

    markdown = "\n".join(lines)

    return {
        "content": markdown,
        "original_filename": filename,
        "converted_from": "HTML"
    }


def get_supported_formats() -> Dict[str, Any]:
    """Get information about all supported formats."""
    return {
        "native": {ext: desc for ext, desc in NATIVE_FORMATS.items()},
        "convertible": {ext: info[1] for ext, info in CONVERTIBLE_FORMATS.items()},
        "all_extensions": sorted(ALL_SUPPORTED)
    }
