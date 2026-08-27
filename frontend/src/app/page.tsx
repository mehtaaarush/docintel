"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL;

type Doc = {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: string;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/documents`);
      if (!res.ok) throw new Error(`Failed to load documents (${res.status})`);
      setDocs(await res.json());
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail ?? `Upload failed (${res.status})`);
      }
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`${API}/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await loadDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">DocIntel</h1>
      <p className="mt-2 text-sm opacity-60">Upload a document, then chat with it.</p>

      <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
        <label className="cursor-pointer text-sm">
          <input
            type="file"
            accept=".pdf,.txt,.md,.docx"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <span className="rounded border px-4 py-2 hover:opacity-70">
            {uploading ? "Uploading..." : "Choose a file"}
          </span>
        </label>
        <p className="mt-3 text-xs opacity-50">PDF, TXT, MD, or DOCX up to 20MB</p>
      </div>

      {error && (
        <p className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-50">
          Documents
        </h2>

        {loading ? (
          <p className="mt-4 text-sm opacity-60">Loading...</p>
        ) : docs.length === 0 ? (
          <p className="mt-4 text-sm opacity-60">No documents yet.</p>
        ) : (
          <ul className="mt-4 divide-y">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  {doc.status === "ready" ? (
                    <Link
                      href={`/documents/${doc.id}`}
                      className="truncate text-sm underline-offset-4 hover:underline"
                    >
                      {doc.filename}
                    </Link>
                  ) : (
                    <p className="truncate text-sm">{doc.filename}</p>
                  )}
                  <p className="text-xs opacity-50">
                    {formatSize(doc.size_bytes)} - {doc.status}
                    {doc.status === "ready" && ` - ${doc.chunk_count} chunks`}
                    {doc.status === "processing" && " (indexing...)"}
                  </p>
                  {doc.error_message && (
                    <p className="mt-1 text-xs text-red-400">{doc.error_message}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="ml-4 shrink-0 text-xs opacity-50 hover:opacity-100"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
