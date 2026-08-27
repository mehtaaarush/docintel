import json
import uuid
from pathlib import Path

import faiss
import numpy as np

from app.config import settings
from app.embeddings import EMBED_DIM


def index_root() -> Path:
    root = Path(settings.upload_dir).parent / "indexes"
    root.mkdir(parents=True, exist_ok=True)
    return root


def index_path(document_id: uuid.UUID) -> Path:
    return index_root() / f"{document_id}.faiss"


def mapping_path(document_id: uuid.UUID) -> Path:
    return index_root() / f"{document_id}.json"


def build_index(document_id: uuid.UUID, vectors: np.ndarray, chunk_ids: list[str]) -> None:
    """Create and persist a FAISS index plus its row-to-chunk-id mapping."""
    faiss.normalize_L2(vectors)
    index = faiss.IndexFlatIP(EMBED_DIM)
    index.add(vectors)
    faiss.write_index(index, str(index_path(document_id)))
    mapping_path(document_id).write_text(json.dumps(chunk_ids), encoding="utf-8")


def search(document_id: uuid.UUID, query_vector: np.ndarray, k: int = 5) -> list[tuple[str, float]]:
    """Return [(chunk_id, similarity), ...] for the k nearest chunks."""
    path = index_path(document_id)
    if not path.exists():
        return []

    index = faiss.read_index(str(path))
    chunk_ids: list[str] = json.loads(mapping_path(document_id).read_text(encoding="utf-8"))

    faiss.normalize_L2(query_vector)
    k = min(k, index.ntotal)
    if k == 0:
        return []

    scores, positions = index.search(query_vector, k)
    return [
        (chunk_ids[pos], float(score))
        for pos, score in zip(positions[0], scores[0])
        if pos != -1
    ]


def delete_index(document_id: uuid.UUID) -> None:
    index_path(document_id).unlink(missing_ok=True)
    mapping_path(document_id).unlink(missing_ok=True)
