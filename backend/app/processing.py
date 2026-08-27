import logging
import uuid

from sqlalchemy.orm import Session

from app import models, storage, vectorstore
from app.chunking import chunk_pages
from app.db import SessionLocal
from app.embeddings import embed_documents
from app.extract import ExtractionError, extract

logger = logging.getLogger(__name__)


def _set_status(db: Session, document: models.Document, status: str, error: str | None = None) -> None:
    document.status = status
    document.error_message = error
    db.commit()


def process_document(document_id: uuid.UUID) -> None:
    """Extract, chunk, embed and index a document. Runs in the background."""
    db = SessionLocal()
    try:
        document = db.get(models.Document, document_id)
        if document is None:
            logger.warning("Document %s vanished before processing", document_id)
            return

        _set_status(db, document, "processing")

        try:
            path = storage.build_stored_path(document.id, document.filename)
            if not path.exists():
                raise ExtractionError("Stored file is missing")

            pages = extract(path)
            pairs = chunk_pages(pages)
            if not pairs:
                raise ExtractionError("Document produced no chunks")

            chunks = [
                models.Chunk(
                    document_id=document.id,
                    chunk_index=i,
                    content=text,
                    page_number=page,
                )
                for i, (page, text) in enumerate(pairs)
            ]
            db.add_all(chunks)
            db.flush()

            vectors = embed_documents([c.content for c in chunks])
            vectorstore.build_index(document.id, vectors, [str(c.id) for c in chunks])

            document.chunk_count = len(chunks)
            _set_status(db, document, "ready")
            logger.info("Indexed %s chunks for document %s", len(chunks), document_id)

        except ExtractionError as exc:
            db.rollback()
            document = db.get(models.Document, document_id)
            if document:
                _set_status(db, document, "failed", str(exc))
        except Exception as exc:
            logger.exception("Processing failed for %s", document_id)
            db.rollback()
            document = db.get(models.Document, document_id)
            if document:
                _set_status(db, document, "failed", f"Processing error: {exc}")
    finally:
        db.close()
