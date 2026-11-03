"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api, type Doc } from "@/lib/api";
import { ErrorBanner, FileBadge, StatusPill, TopBar } from "@/components/ui";

const ACCEPTED = [".pdf", ".txt", ".md", ".docx"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    try {
      setDocs(await api.listDocuments());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    const pending = docs.some((d) => d.status === "uploaded" || d.status === "processing");
    if (!pending) return;
    const timer = setInterval(loadDocs, 2000);
    return () => clearInterval(timer);
  }, [docs, loadDocs]);

  async function uploadFile(file: File) {
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported file type. Use ${ACCEPTED.join(", ").toUpperCase()}.`);
      return;
    }

    setUploading(file.name);
    setError(null);
    try {
      await api.uploadDocument(file);
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !uploading) uploadFile(file);
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteDocument(id);
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const readyCount = docs.filter((d) => d.status === "ready").length;
  const chunkCount = docs.reduce((sum, d) => sum + (d.chunk_count ?? 0), 0);

  return (
    <>
      <TopBar>
        <span className="hidden text-xs text-muted sm:inline">Grounded answers, with citations</span>
      </TopBar>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <section className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Retrieval-augmented document Q&amp;A
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Ask your documents{" "}
            <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
              anything.
            </span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Upload a PDF, Word doc or text file. DocIntel indexes it, then answers your
            questions using only what&apos;s inside, citing the exact passages it used.
          </p>
        </section>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!uploading) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) inputRef.current?.click();
          }}
          className={`group relative mt-10 cursor-pointer overflow-hidden rounded-2xl border border-dashed p-10 text-center transition-all sm:p-12 ${
            dragging
              ? "border-accent bg-accent/[0.08]"
              : "border-line-strong bg-surface/50 hover:border-accent/50 hover:bg-surface"
          } ${uploading ? "cursor-wait" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={handleInput}
            disabled={!!uploading}
            className="hidden"
          />

          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-line bg-surface-2 transition-transform group-hover:-translate-y-0.5">
            {uploading ? (
              <svg className="h-5 w-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M6 10l6-6 6 6" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            )}
          </div>

          {uploading ? (
            <>
              <p className="mt-4 text-sm font-medium">Uploading {uploading}…</p>
              <p className="mt-1 text-xs text-muted">Indexing starts automatically once it lands.</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm font-medium">
                <span className="text-accent">Click to upload</span> or drag and drop
              </p>
              <p className="mt-1 text-xs text-muted">PDF, DOCX, TXT or MD · up to 20 MB</p>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Your documents</h2>
              <p className="mt-1 text-xs text-muted">
                {loading
                  ? "Loading library…"
                  : `${docs.length} ${docs.length === 1 ? "document" : "documents"} · ${readyCount} ready · ${chunkCount.toLocaleString()} chunks indexed`}
              </p>
            </div>
          </div>

          {loading ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="h-[84px] animate-pulse rounded-xl border border-line bg-surface/60" />
              ))}
            </ul>
          ) : docs.length === 0 ? (
            <div className="mt-5 rounded-xl border border-line bg-surface/40 px-6 py-12 text-center">
              <p className="text-sm font-medium">No documents yet</p>
              <p className="mt-1 text-xs text-muted">Upload your first file above to start chatting with it.</p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {docs.map((doc) => {
                const ready = doc.status === "ready";
                const body = (
                  <>
                    <FileBadge filename={doc.filename} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <StatusPill status={doc.status} />
                        <span>{formatSize(doc.size_bytes)}</span>
                        {ready && <span>· {doc.chunk_count} chunks</span>}
                        {doc.created_at && <span className="hidden sm:inline">· {formatDate(doc.created_at)}</span>}
                      </div>
                      {doc.error_message && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-red-300/90">{doc.error_message}</p>
                      )}
                    </div>
                  </>
                );

                return (
                  <li
                    key={doc.id}
                    className={`group relative flex items-center rounded-xl border border-line bg-surface/60 transition-all ${
                      ready ? "hover:-translate-y-px hover:border-line-strong hover:bg-surface" : ""
                    }`}
                  >
                    {ready ? (
                      <Link href={`/documents/${doc.id}`} className="flex min-w-0 flex-1 items-center gap-3.5 p-4 pr-2">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3.5 p-4 pr-2">{body}</div>
                    )}

                    <div className="flex shrink-0 items-center gap-1 pr-3">
                      {ready && (
                        <Link
                          href={`/documents/${doc.id}`}
                          className="hidden rounded-lg px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10 sm:inline-block"
                        >
                          Chat →
                        </Link>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        aria-label={`Delete ${doc.filename}`}
                        title="Delete"
                        className="rounded-lg p-2 text-muted opacity-60 transition-all hover:bg-red-500/10 hover:text-red-300 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        DocIntel · Next.js, FastAPI, PostgreSQL, FAISS &amp; Gemini
      </footer>
    </>
  );
}
