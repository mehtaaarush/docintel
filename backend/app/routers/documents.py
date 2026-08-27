import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas, storage
from app.config import settings
from app.db import get_db

router = APIRouter(prefix="/documents", tags=["documents"])


def _get_or_create_demo_user(db: Session) -> models.User:
    """Temporary stand-in until auth lands in a later phase."""
    stmt = select(models.User).where(models.User.email == "demo@docintel.local")
    user = db.scalars(stmt).first()
    if user is None:
        user = models.User(email="demo@docintel.local")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("", response_model=schemas.DocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(payload: schemas.DocumentCreate, db: Session = Depends(get_db)):
    user = _get_or_create_demo_user(db)
    document = models.Document(
        user_id=user.id,
        filename=payload.filename,
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.post("/upload", response_model=schemas.DocumentRead, status_code=status.HTTP_201_CREATED)
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in storage.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type {suffix!r}. Allowed: {sorted(storage.ALLOWED_EXTENSIONS)}",
        )

    max_bytes = settings.max_upload_mb * 1024 * 1024
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)

    if size == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    if size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File is {size / 1024 / 1024:.1f}MB; limit is {settings.max_upload_mb}MB",
        )

    user = _get_or_create_demo_user(db)
    document = models.Document(
        user_id=user.id,
        filename=file.filename or "untitled",
        content_type=file.content_type or "application/octet-stream",
        size_bytes=size,
        status="uploaded",
    )
    db.add(document)
    db.flush()

    destination = storage.build_stored_path(document.id, document.filename)
    try:
        storage.save_upload(file, destination)
    except Exception:
        db.rollback()
        storage.delete_file(destination)
        raise HTTPException(status_code=500, detail="Failed to store file")

    db.commit()
    db.refresh(document)
    return document


@router.get("", response_model=list[schemas.DocumentRead])
def list_documents(db: Session = Depends(get_db)):
    user = _get_or_create_demo_user(db)
    stmt = (
        select(models.Document)
        .where(models.Document.user_id == user.id)
        .order_by(models.Document.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.get("/{document_id}", response_model=schemas.DocumentRead)
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db)):
    document = db.get(models.Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: uuid.UUID, db: Session = Depends(get_db)):
    document = db.get(models.Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    storage.delete_file(storage.build_stored_path(document.id, document.filename))
    db.delete(document)
    db.commit()
