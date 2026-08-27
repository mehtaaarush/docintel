import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app import models, vectorstore
from app.embeddings import embed_query

TOP_K = 5
MIN_SCORE = 0.55


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    content: str
    page_number: int | None
    chunk_index: int
    score: float


def retrieve(db: Session, document_id: uuid.UUID, question: str, k: int = TOP_K) -> list[RetrievedChunk]:
    """Return the most relevant chunks for a question, best first."""
    query_vector = embed_query(question)
    hits = vectorstore.search(document_id, query_vector, k=k)
    if not hits:
        return []

    scores = {chunk_id: score for chunk_id, score in hits if score >= MIN_SCORE}
    if not scores:
        return []

    rows = (
        db.query(models.Chunk)
        .filter(models.Chunk.id.in_([uuid.UUID(cid) for cid in scores]))
        .all()
    )

    results = [
        RetrievedChunk(
            chunk_id=row.id,
            content=row.content,
            page_number=row.page_number,
            chunk_index=row.chunk_index,
            score=scores[str(row.id)],
        )
        for row in rows
    ]
    results.sort(key=lambda r: r.score, reverse=True)
    return results
