import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
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
    db.delete(document)
    db.commit()
