# DocIntel

Upload a document, chat with it, get answers grounded in the source with page-level citations.

**Live:** https://docintel-ashen.vercel.app
**API docs:** https://docintel-api-03mf.onrender.com/docs

> The API runs on a free tier that sleeps after inactivity. The first request may take 30-50 seconds.

## What it does

Upload a PDF, DOCX, TXT or MD file. The backend extracts text with page provenance, splits it into overlapping chunks on sentence boundaries, embeds each chunk with Gemini, and stores the vectors in a per-document FAISS index. Asking a question embeds the query, retrieves the nearest chunks above a similarity threshold, and passes only those excerpts to Gemini with instructions to answer from them alone. Every answer carries citations showing which excerpt, which page, and what similarity score it came from.

Questions the document cannot answer are refused rather than guessed at. Ask it the capital of Mongolia and it will tell you the excerpts do not contain that.

## Architecture

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind | Vercel |
| API | FastAPI, Pydantic, SQLAlchemy 2.0 | Render (Docker) |
| Database | PostgreSQL 18, Alembic migrations | Render |
| Vectors | FAISS (IndexFlatIP, cosine) | Local disk |
| Embeddings | Gemini `gemini-embedding-001`, 3072-dim | Google AI |
| Generation | Gemini `gemini-3.6-flash` | Google AI |

Python owns retrieval and generation; TypeScript owns the interface; they communicate over a documented REST API.

## Design decisions

**Async ingestion.** Embedding a document takes seconds to minutes, so upload returns immediately and processing runs in the background. Status moves `uploaded` -> `processing` -> `ready` or `failed`, and the client polls only while work is pending.

**Filesystem and database consistency.** Uploads flush the database row to obtain an ID, write the file named by that UUID, and only then commit. A failed write rolls back, leaving no orphaned row. Files are never named from user input, which neutralizes path traversal.

**Asymmetric embeddings.** Chunks are embedded with `RETRIEVAL_DOCUMENT` and queries with `RETRIEVAL_QUERY`. Gemini maps questions and answers into a shared space only when the task type is declared, and using one type for both measurably degrades retrieval.

**Similarity threshold tuned from data.** Text embeddings have a similarity floor around 0.5 for any two pieces of English prose, so an initial threshold of 0.3 filtered nothing. Measuring scores on relevant queries (0.66-0.70) against irrelevant ones (0.50-0.52) put the cutoff at 0.55, which refuses off-topic questions before any model call.

**Page provenance from extraction.** Text is extracted as (page number, text) pairs and page numbers travel through chunking into the database, which is what makes citations point at real locations.

**Migrations over `create_all`.** Every schema change is a versioned Alembic script that runs on container start, so production schema is reproducible and incremental rather than hand-managed.

## Known limitations

- **Ephemeral storage.** The free Render tier has no persistent disk, so uploaded files and FAISS indexes are lost on restart. Production would use object storage for files and pgvector for embeddings.
- **Shared demo user.** There is no authentication yet, so all visitors share one document list.
- **Naive chunking.** Character-based splitting with sentence-boundary breaks. Structure-aware chunking that respects headings and tables would retrieve better.
- **In-process background tasks.** FastAPI `BackgroundTasks` runs in the web process, so a restart mid-job strands a document in `processing`. A durable queue (Celery, RQ) is the production answer.
- **No OCR.** Scanned PDFs contain no extractable text; these are detected and reported rather than silently indexed empty.

## Running locally

Requires Docker, Python 3.12, Node 20+, and a Gemini API key.

```bash
git clone https://github.com/mehtaaarush/docintel
cd docintel
docker compose up -d db

cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1     # source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # then set GOOGLE_API_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

```bash
cd frontend
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local
npm run dev
```

Frontend at `localhost:3000`, API docs at `localhost:8000/docs`.
