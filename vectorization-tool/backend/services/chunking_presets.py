"""
Chunking presets optimized for different content types.

Based on research from:
- arXiv:2505.21700 - "Rethinking Chunk Size For Long-Document Retrieval"
- arXiv:2501.07391 - "Enhancing RAG: A Study of Best Practices"
- Chroma Research - "Evaluating Chunking Strategies for Retrieval"
- NVIDIA Technical Blog - "Finding the Best Chunking Strategy"
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from pathlib import Path
import re


@dataclass
class ChunkingPresetConfig:
    """Configuration for a chunking preset."""
    name: str
    description: str

    # Chunking parameters
    chunk_size: int  # in characters
    chunk_overlap: int  # in characters
    strategy: str  # chunking strategy name

    # Embedding model recommendation
    recommended_model: str = "text-embedding-3-large"

    # Additional strategy-specific options
    separators: Optional[List[str]] = None
    keep_separator: bool = True

    # Approximate token equivalents (for reference)
    @property
    def approx_tokens(self) -> int:
        """Approximate token count (4 chars per token for English)."""
        return self.chunk_size // 4

    @property
    def approx_overlap_tokens(self) -> int:
        """Approximate overlap in tokens."""
        return self.chunk_overlap // 4


class ChunkingPreset(Enum):
    """
    Predefined chunking presets optimized for different content types.

    Research findings:
    - Smaller chunks (200-400 tokens) best for fact-based, bullet-point content
    - Larger chunks (512-1024 tokens) best for context-heavy, narrative content
    - Semantic chunking improves precision but at computational cost
    - 10-20% overlap is optimal for most use cases
    """

    # For lecture slides, presentations, bullet-point heavy content
    SLIDES = ChunkingPresetConfig(
        name="slides",
        description="Optimized for lecture slides and presentations with bullet points",
        chunk_size=600,  # ~150 tokens - captures 1-2 slides per chunk
        chunk_overlap=60,  # 10% overlap
        strategy="recursive",
        separators=["\n\n", "\n", "• ", "- ", ". ", " ", ""],
        keep_separator=True
    )

    # For academic papers, readings, dense text
    ACADEMIC = ChunkingPresetConfig(
        name="academic",
        description="Optimized for academic papers and dense readings",
        chunk_size=2000,  # ~500 tokens
        chunk_overlap=400,  # 20% overlap
        strategy="semantic",  # Semantic chunking for complex content
        keep_separator=True
    )

    # For technical documentation, handouts
    DOCS = ChunkingPresetConfig(
        name="docs",
        description="Optimized for technical documentation and handouts",
        chunk_size=1600,  # ~400 tokens
        chunk_overlap=240,  # 15% overlap
        strategy="recursive",
        separators=["\n\n", "\n", "```", ". ", " ", ""],
        keep_separator=True
    )

    # For code files
    CODE = ChunkingPresetConfig(
        name="code",
        description="Optimized for source code files",
        chunk_size=2000,  # ~500 tokens - function-level
        chunk_overlap=200,  # 10% overlap
        strategy="recursive",
        separators=[
            "\nclass ", "\ndef ", "\n\ndef ", "\n\n", "\n",
            "function ", "const ", "let ", "var ",
            "public ", "private ", "protected ",
            " ", ""
        ],
        keep_separator=True
    )

    # For highly granular, fact-based content (Q&A, definitions)
    GRANULAR = ChunkingPresetConfig(
        name="granular",
        description="Fine-grained chunks for fact-heavy content",
        chunk_size=600,  # ~150 tokens
        chunk_overlap=60,  # 10% overlap
        strategy="sentence",
        keep_separator=True
    )

    # Balanced default
    DEFAULT = ChunkingPresetConfig(
        name="default",
        description="Balanced preset for general content",
        chunk_size=1600,  # ~400 tokens
        chunk_overlap=240,  # 15% overlap
        strategy="recursive",
        keep_separator=True
    )

    @classmethod
    def get_by_name(cls, name: str) -> Optional['ChunkingPreset']:
        """Get preset by name (case-insensitive)."""
        name_lower = name.lower()
        for preset in cls:
            if preset.value.name == name_lower:
                return preset
        return None

    @classmethod
    def list_presets(cls) -> List[Dict[str, Any]]:
        """List all available presets with their configurations."""
        return [
            {
                "name": preset.value.name,
                "description": preset.value.description,
                "chunk_size": preset.value.chunk_size,
                "chunk_overlap": preset.value.chunk_overlap,
                "approx_tokens": preset.value.approx_tokens,
                "strategy": preset.value.strategy
            }
            for preset in cls
        ]


# File extension to content type mapping
EXTENSION_CONTENT_TYPE = {
    # Slides and presentations
    ".ppt": "slides",
    ".pptx": "slides",
    ".key": "slides",
    ".odp": "slides",

    # Academic/dense documents
    ".tex": "academic",
    ".bib": "academic",

    # Code files
    ".py": "code",
    ".js": "code",
    ".ts": "code",
    ".jsx": "code",
    ".tsx": "code",
    ".java": "code",
    ".c": "code",
    ".cpp": "code",
    ".h": "code",
    ".hpp": "code",
    ".cs": "code",
    ".go": "code",
    ".rs": "code",
    ".rb": "code",
    ".php": "code",
    ".swift": "code",
    ".kt": "code",
    ".scala": "code",
    ".r": "code",
    ".sql": "code",
    ".sh": "code",
    ".bash": "code",
    ".ps1": "code",
    ".yaml": "code",
    ".yml": "code",
    ".json": "code",
    ".xml": "code",
    ".html": "code",
    ".css": "code",
    ".scss": "code",
    ".ipynb": "code",

    # Technical documentation
    ".md": "docs",
    ".rst": "docs",
    ".txt": "docs",

    # General documents (need content analysis)
    ".pdf": None,  # Analyze content
    ".doc": None,
    ".docx": None,
}


class ContentTypeDetector:
    """
    Detects content type to recommend appropriate chunking preset.

    Uses a combination of:
    1. File extension mapping
    2. Content analysis heuristics
    3. Filename pattern matching
    """

    # Filename patterns suggesting content type
    FILENAME_PATTERNS = {
        "slides": [
            r"lecture", r"slide", r"presentation", r"ppt", r"week\d+",
            r"class\d+", r"session", r"module"
        ],
        "academic": [
            r"paper", r"article", r"journal", r"research", r"study",
            r"thesis", r"dissertation", r"chapter", r"reading"
        ],
        "code": [
            r"code", r"script", r"program", r"solution", r"lab\d*",
            r"assignment", r"homework", r"hw\d+", r"pa\d+"
        ],
        "docs": [
            r"guide", r"manual", r"documentation", r"readme", r"tutorial",
            r"howto", r"reference", r"handbook"
        ]
    }

    # Content patterns suggesting content type
    CONTENT_PATTERNS = {
        "slides": [
            # Bullet point heavy
            (r"^[\s]*[•\-\*]\s", 0.3),  # Bullet points
            (r"\n[\s]*[•\-\*]\s", 0.2),  # Multiple bullets
            (r"^\d+\.\s", 0.1),  # Numbered lists
            # Short lines (typical of slides)
            (r"\n[^\n]{1,50}\n", 0.15),  # Short paragraphs
        ],
        "academic": [
            # Academic markers
            (r"\babstract\b", 0.4),
            (r"\bintroduction\b", 0.2),
            (r"\bconclusion\b", 0.2),
            (r"\breferences\b", 0.3),
            (r"\bcitation\b", 0.2),
            (r"\bet\s+al\.", 0.3),
            (r"\[\d+\]", 0.2),  # Citation brackets
            # Long paragraphs (typical of papers)
            (r"\n[^\n]{200,}\n", 0.1),
        ],
        "code": [
            # Code patterns
            (r"def\s+\w+\s*\(", 0.4),  # Python functions
            (r"function\s+\w+\s*\(", 0.4),  # JS functions
            (r"class\s+\w+", 0.3),
            (r"import\s+", 0.2),
            (r"from\s+\w+\s+import", 0.3),
            (r"#include", 0.3),
            (r"public\s+class", 0.4),
            (r"\{\s*\n", 0.1),  # Code blocks
            (r"//.*\n", 0.1),  # Comments
            (r"#.*\n", 0.05),  # Python/shell comments
        ],
        "docs": [
            # Documentation patterns
            (r"^#\s+", 0.3),  # Markdown headers
            (r"^##\s+", 0.2),
            (r"```", 0.2),  # Code blocks in docs
            (r"\bexample\b", 0.1),
            (r"\bnote:\b", 0.15),
            (r"\bwarning:\b", 0.15),
        ]
    }

    @classmethod
    def detect(
        cls,
        filename: str,
        content: Optional[str] = None,
        file_path: Optional[str] = None
    ) -> ChunkingPreset:
        """
        Detect the best chunking preset for a file.

        Args:
            filename: Name of the file
            content: Optional file content for analysis
            file_path: Optional full path for additional context

        Returns:
            Recommended ChunkingPreset
        """
        scores = {
            "slides": 0.0,
            "academic": 0.0,
            "code": 0.0,
            "docs": 0.0,
            "granular": 0.0
        }

        # 1. Check file extension
        ext = Path(filename).suffix.lower()
        ext_type = EXTENSION_CONTENT_TYPE.get(ext)

        if ext_type and ext_type in scores:
            scores[ext_type] += 2.0  # Strong signal from extension

        # 2. Check filename patterns
        filename_lower = filename.lower()
        for content_type, patterns in cls.FILENAME_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, filename_lower, re.IGNORECASE):
                    scores[content_type] += 0.5
                    break  # Only count once per type

        # 3. Check folder path for context
        if file_path:
            path_lower = file_path.lower()
            # Course material patterns
            if any(p in path_lower for p in ["slides", "lecture", "presentations"]):
                scores["slides"] += 1.0
            if any(p in path_lower for p in ["readings", "papers", "articles"]):
                scores["academic"] += 1.0
            if any(p in path_lower for p in ["code", "labs", "assignments", "homework"]):
                scores["code"] += 1.0

        # 4. Analyze content if provided
        if content:
            content_sample = content[:10000]  # Analyze first 10k chars

            for content_type, patterns in cls.CONTENT_PATTERNS.items():
                for pattern, weight in patterns:
                    matches = len(re.findall(pattern, content_sample, re.IGNORECASE | re.MULTILINE))
                    if matches > 0:
                        # Diminishing returns for many matches
                        score = weight * min(matches, 10) / 10
                        scores[content_type] += score

            # Check average line length (slides tend to have shorter lines)
            lines = content_sample.split('\n')
            non_empty_lines = [l for l in lines if l.strip()]
            if non_empty_lines:
                avg_line_length = sum(len(l) for l in non_empty_lines) / len(non_empty_lines)
                if avg_line_length < 60:
                    scores["slides"] += 0.5
                elif avg_line_length > 150:
                    scores["academic"] += 0.3

        # 5. Find highest scoring type
        best_type = max(scores, key=scores.get)
        best_score = scores[best_type]

        # If no clear winner, use default
        if best_score < 0.5:
            return ChunkingPreset.DEFAULT

        # Map to preset
        preset_map = {
            "slides": ChunkingPreset.SLIDES,
            "academic": ChunkingPreset.ACADEMIC,
            "code": ChunkingPreset.CODE,
            "docs": ChunkingPreset.DOCS,
            "granular": ChunkingPreset.GRANULAR
        }

        return preset_map.get(best_type, ChunkingPreset.DEFAULT)

    @classmethod
    def get_detection_details(
        cls,
        filename: str,
        content: Optional[str] = None,
        file_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get detailed detection results for debugging/transparency.

        Returns dict with scores and reasoning.
        """
        scores = {
            "slides": 0.0,
            "academic": 0.0,
            "code": 0.0,
            "docs": 0.0,
            "granular": 0.0
        }
        reasons = []

        # Extension check
        ext = Path(filename).suffix.lower()
        ext_type = EXTENSION_CONTENT_TYPE.get(ext)
        if ext_type and ext_type in scores:
            scores[ext_type] += 2.0
            reasons.append(f"Extension '{ext}' suggests {ext_type}")

        # Filename patterns
        filename_lower = filename.lower()
        for content_type, patterns in cls.FILENAME_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, filename_lower, re.IGNORECASE):
                    scores[content_type] += 0.5
                    reasons.append(f"Filename matches '{pattern}' pattern ({content_type})")
                    break

        # Path check
        if file_path:
            path_lower = file_path.lower()
            if "slides" in path_lower or "lecture" in path_lower:
                scores["slides"] += 1.0
                reasons.append("Path contains 'slides' or 'lecture'")
            if "readings" in path_lower or "papers" in path_lower:
                scores["academic"] += 1.0
                reasons.append("Path contains 'readings' or 'papers'")

        # Content analysis
        if content:
            content_sample = content[:10000]
            lines = content_sample.split('\n')
            non_empty = [l for l in lines if l.strip()]
            if non_empty:
                avg_len = sum(len(l) for l in non_empty) / len(non_empty)
                reasons.append(f"Average line length: {avg_len:.1f} chars")

        best_type = max(scores, key=scores.get)
        preset = cls.detect(filename, content, file_path)

        return {
            "scores": scores,
            "reasons": reasons,
            "detected_type": best_type,
            "recommended_preset": preset.value.name,
            "preset_config": {
                "chunk_size": preset.value.chunk_size,
                "chunk_overlap": preset.value.chunk_overlap,
                "strategy": preset.value.strategy,
                "approx_tokens": preset.value.approx_tokens
            }
        }
