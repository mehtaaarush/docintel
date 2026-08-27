"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, parseCitations, type Chat, type Doc, type Message } from "@/lib/api";

function CitationList({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const citations = parseCitations(message.citations);
  if (citations.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs opacity-50 hover:opacity-100"
      >
        {open ? "Hide" : "Show"} {citations.length} sources
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {citations.map((c) => (
            <li key={c.chunk_id} className="rounded border p-3 text-xs">
              <p className="opacity-60">
                [{c.index}] {c.page_number ? `Page ${c.page_number}` : "Unknown page"} -
                score {c.score.toFixed(3)}
              </p>
              <p className="mt-1 opacity-80">{c.preview}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DocumentChat() {
  const params = useParams();
  const documentId = params.id as string;

  const [doc, setDoc] = useState<Doc | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.getDocument(documentId);
        if (cancelled) return;
        setDoc(d);
        const c = await api.createChat(documentId);
        if (cancelled) return;
        setChat(c);
        setMessages(c.messages ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function handleAsk() {
    const text = question.trim();
    if (!text || !chat || thinking) return;

    setQuestion("");
    setThinking(true);
    setError(null);

    try {
      const res = await api.ask(chat.id, text);
      setMessages((prev) => [...prev, res.user_message, res.assistant_message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get an answer");
      setQuestion(text);
    } finally {
      setThinking(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <div className="shrink-0">
        <Link href="/" className="text-xs opacity-50 hover:opacity-100">
          Back to documents
        </Link>
        <h1 className="mt-3 truncate text-xl font-semibold">
          {doc?.filename ?? "Loading..."}
        </h1>
        {doc && (
          <p className="mt-1 text-xs opacity-50">
            {doc.chunk_count} chunks indexed
          </p>
        )}
      </div>

      <div className="mt-8 flex-1 space-y-6">
        {messages.length === 0 && !thinking && (
          <p className="text-sm opacity-50">
            Ask a question about this document.
          </p>
        )}

        {messages.map((m) => (
          <div key={m.id}>
            <p className="text-xs uppercase tracking-wide opacity-40">
              {m.role === "user" ? "You" : "DocIntel"}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
              {m.content}
            </p>
            {m.role === "assistant" && <CitationList message={m} />}
          </div>
        ))}

        {thinking && <p className="text-sm opacity-50">Searching the document...</p>}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 mt-6 shrink-0 bg-black/80 py-4 backdrop-blur">
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder="Ask something..."
            disabled={!chat || thinking}
            className="flex-1 rounded border bg-transparent px-3 py-2 text-sm outline-none focus:border-white/40"
          />
          <button
            onClick={handleAsk}
            disabled={!chat || thinking || !question.trim()}
            className="rounded border px-4 py-2 text-sm disabled:opacity-30"
          >
            Ask
          </button>
        </div>
      </div>
    </main>
  );
}
