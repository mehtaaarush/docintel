import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, rag, retrieval, schemas
from app.db import get_db
from app.routers.documents import _get_or_create_demo_user

router = APIRouter(prefix="/chats", tags=["chats"])


@router.post("", response_model=schemas.ChatRead, status_code=status.HTTP_201_CREATED)
def create_chat(payload: schemas.ChatCreate, db: Session = Depends(get_db)):
    user = _get_or_create_demo_user(db)
    document = db.get(models.Document, payload.document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.status != "ready":
        raise HTTPException(
            status_code=409,
            detail=f"Document is not ready (status: {document.status})",
        )

    chat = models.Chat(
        user_id=user.id,
        document_id=document.id,
        title=document.filename[:255],
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


@router.get("", response_model=list[schemas.ChatRead])
def list_chats(db: Session = Depends(get_db)):
    user = _get_or_create_demo_user(db)
    stmt = (
        select(models.Chat)
        .where(models.Chat.user_id == user.id)
        .order_by(models.Chat.created_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.get("/{chat_id}", response_model=schemas.ChatWithMessages)
def get_chat(chat_id: uuid.UUID, db: Session = Depends(get_db)):
    chat = db.get(models.Chat, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


@router.post("/{chat_id}/ask", response_model=schemas.AskResponse)
def ask(chat_id: uuid.UUID, payload: schemas.AskRequest, db: Session = Depends(get_db)):
    chat = db.get(models.Chat, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")

    user_message = models.Message(chat_id=chat.id, role="user", content=payload.question)
    db.add(user_message)
    db.flush()

    try:
        chunks = retrieval.retrieve(db, chat.document_id, payload.question)
        answer_text = rag.answer(payload.question, chunks)
        citations = rag.build_citations(chunks) if chunks else None
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"Answer generation failed: {exc}")

    assistant_message = models.Message(
        chat_id=chat.id,
        role="assistant",
        content=answer_text,
        citations=citations,
    )
    db.add(assistant_message)
    db.commit()
    db.refresh(user_message)
    db.refresh(assistant_message)

    return schemas.AskResponse(user_message=user_message, assistant_message=assistant_message)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(chat_id: uuid.UUID, db: Session = Depends(get_db)):
    chat = db.get(models.Chat, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete(chat)
    db.commit()
