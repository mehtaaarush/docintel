import re

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?\n])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def chunk_page(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks, breaking on sentence boundaries."""
    sentences = _split_sentences(text)
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for sentence in sentences:
        if current_len + len(sentence) > size and current:
            chunks.append(" ".join(current))
            tail: list[str] = []
            tail_len = 0
            for s in reversed(current):
                if tail_len + len(s) > overlap:
                    break
                tail.insert(0, s)
                tail_len += len(s)
            current = tail
            current_len = tail_len
        current.append(sentence)
        current_len += len(sentence)

    if current:
        chunks.append(" ".join(current))

    return [c for c in chunks if c.strip()]


def chunk_pages(pages: list[tuple[int, str]]) -> list[tuple[int, str]]:
    """Return [(page_number, chunk_text), ...] across all pages."""
    result: list[tuple[int, str]] = []
    for page_number, text in pages:
        for chunk in chunk_page(text):
            result.append((page_number, chunk))
    return result
