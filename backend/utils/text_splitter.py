"""Text splitting utilities for document chunking."""

from typing import List, Dict, Any
from langchain.text_splitter import RecursiveCharacterTextSplitter


def count_tokens(text: str, model: str = "gpt-4") -> int:
    """Estimate token count (approx 4 chars per token for English)."""
    return len(text) // 4


def split_text(
    text: str,
    chunk_size: int = 450,
    chunk_overlap: int = 90,
) -> List[Dict[str, Any]]:
    """
    Split text into chunks.

    Args:
        text: Text to split
        chunk_size: Size of each chunk (in characters)
        chunk_overlap: Overlap between chunks

    Returns:
        List of chunk dicts with text and metadata
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    chunks = splitter.split_text(text)

    result = []
    char_position = 0

    for i, chunk in enumerate(chunks):
        start_pos = text.find(chunk, char_position)
        if start_pos == -1:
            start_pos = char_position
        end_pos = start_pos + len(chunk)

        result.append({
            "text": chunk,
            "index": i,
            "char_start": start_pos,
            "char_end": end_pos,
            "token_count": count_tokens(chunk)
        })

        char_position = start_pos + len(chunk) - chunk_overlap

    return result
