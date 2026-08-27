import numpy as np
from google import genai
from google.genai import types

from app.config import settings

EMBED_MODEL = "gemini-embedding-001"
EMBED_DIM = 3072
BATCH_SIZE = 20

_client: genai.Client | None = None


def client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.google_api_key)
    return _client


def _embed_batch(texts: list[str], task_type: str) -> list[list[float]]:
    response = client().models.embed_content(
        model=EMBED_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(task_type=task_type),
    )
    return [e.values for e in response.embeddings]


def embed_documents(texts: list[str]) -> np.ndarray:
    """Embed chunk texts for indexing. Returns (n, EMBED_DIM) float32 array."""
    vectors: list[list[float]] = []
    for i in range(0, len(texts), BATCH_SIZE):
        vectors.extend(_embed_batch(texts[i : i + BATCH_SIZE], "RETRIEVAL_DOCUMENT"))
    return np.array(vectors, dtype="float32")


def embed_query(text: str) -> np.ndarray:
    """Embed a user question for search. Returns (1, EMBED_DIM) float32 array."""
    vectors = _embed_batch([text], "RETRIEVAL_QUERY")
    return np.array(vectors, dtype="float32")
