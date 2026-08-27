from pathlib import Path

import pypdf
from docx import Document as DocxDocument


class ExtractionError(Exception):
    pass


def extract_pdf(path: Path) -> list[tuple[int, str]]:
    pages: list[tuple[int, str]] = []
    reader = pypdf.PdfReader(str(path))
    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append((i, text))
    return pages


def extract_docx(path: Path) -> list[tuple[int, str]]:
    doc = DocxDocument(str(path))
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return [(1, text)] if text.strip() else []


def extract_text_file(path: Path) -> list[tuple[int, str]]:
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    return [(1, text)] if text else []


def extract(path: Path) -> list[tuple[int, str]]:
    """Return [(page_number, text), ...] for a stored document."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        pages = extract_pdf(path)
    elif suffix == ".docx":
        pages = extract_docx(path)
    elif suffix in {".txt", ".md"}:
        pages = extract_text_file(path)
    else:
        raise ExtractionError(f"Cannot extract text from {suffix} files")

    if not pages:
        raise ExtractionError(
            "No text found. The file may be empty or a scanned image requiring OCR."
        )
    return pages
