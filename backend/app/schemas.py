import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    created_at: datetime


class DocumentCreate(BaseModel):
    filename: str = Field(min_length=1, max_length=512)
    content_type: str = Field(min_length=1, max_length=128)
    size_bytes: int = Field(ge=0)


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int
    status: str
    chunk_count: int
    error_message: str | None
    created_at: datetime


class Citation(BaseModel):
    index: int
    chunk_id: str
    page_number: int | None
    score: float
    preview: str


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chat_id: uuid.UUID
    role: str
    content: str
    citations: str | None
    created_at: datetime


class ChatCreate(BaseModel):
    document_id: uuid.UUID


class ChatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    title: str
    created_at: datetime


class ChatWithMessages(ChatRead):
    messages: list[MessageRead]


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class AskResponse(BaseModel):
    user_message: MessageRead
    assistant_message: MessageRead
