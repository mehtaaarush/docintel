import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}


def upload_root() -> Path:
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def build_stored_path(document_id: uuid.UUID, original_filename: str) -> Path:
    suffix = Path(original_filename).suffix.lower()
    return upload_root() / f"{document_id}{suffix}"


def save_upload(file: UploadFile, destination: Path) -> int:
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return destination.stat().st_size


def delete_file(path: Path) -> None:
    path.unlink(missing_ok=True)
