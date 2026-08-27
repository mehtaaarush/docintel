import json

from google.genai import types

from app.embeddings import client
from app.retrieval import RetrievedChunk

CHAT_MODEL = "gemini-3.6-flash"

SYSTEM_PROMPT = """You answer questions about a specific document using only the excerpts provided.

Rules:
- Use only information present in the excerpts. Do not add outside knowledge.
- If the excerpts do not contain the answer, say so plainly. Do not guess.
- Cite the excerpt number in square brackets after each claim, like [1] or [2][3].
- Be concise and direct. Do not pad the answer.
"""


def build_context(chunks: list[RetrievedChunk]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, start=1):
        page = f"page {chunk.page_number}" if chunk.page_number else "unknown page"
        parts.append(f"[{i}] ({page})\n{chunk.content}")
    return "\n\n".join(parts)


def build_citations(chunks: list[RetrievedChunk]) -> str:
    return json.dumps(
        [
            {
                "index": i,
                "chunk_id": str(c.chunk_id),
                "page_number": c.page_number,
                "score": round(c.score, 4),
                "preview": c.content[:200],
            }
            for i, c in enumerate(chunks, start=1)
        ]
    )


def answer(question: str, chunks: list[RetrievedChunk]) -> str:
    if not chunks:
        return "I could not find anything relevant to that question in this document."

    prompt = f"Excerpts:\n\n{build_context(chunks)}\n\nQuestion: {question}"

    response = client().models.generate_content(
        model=CHAT_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
        ),
    )
    return response.text or "The model returned an empty response."
