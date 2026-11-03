"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, parseCitations, type Chat, type Doc, type Message } from "@/lib/api";
import { ErrorBanner, FileBadge, StatusPill, TopBar } from "@/components/ui";

const SUGGESTIONS = [
  "Summarize this document in five bullet points",
  "What are the key findings or conclusions?",
  "List any important dates, numbers or figures",
  "What questions does this document leave open?",
];

function CitationList({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const citations = parseCitations(message.citations);
  if (citations.length === 0) return null;

  return (
    <div className="mt-4 border-t border-line pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
        {citations.length} {citations.length === 1 ? "source" : "sources"}
        {!open && (
          <span className="ml-1 flex gap-1">
            {citations.slice(0, 6).map((c) => (
              <span key={c.chunk_id} className="rounded bg-accent/15 px-1.5 py-px font-mono text-[10px] text-accent">
                {c.index}
              </span>
            ))}
          </span>
        )}
      </button>
      {open && (
        <ul className="mt-3 grid gap-2">
          {citations.map((c) => (
            <li key={c.chunk_id} className="rounded-lg border border-line bg-background/60 p-3">
              <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-2">
                  <span className="rounded bg-accent/15 px-1.5 py-px font-mono text-accent">{c.index}</span>
                  {c.page_number ? `Page ${c.page_number}` : "Page unknown"}
                </span>
                <span className="flex items-center gap-2">
                  <span className="hidden h-1 w-14 overflow-hidden rounded-full bg-white/10 sm:block">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                      style={{ width: `${Math.max(4, Math.min(100, c.score * 100))}%` }}
                    />
                  </span>
                  <span className="font-mono">{c.score.toFixed(3)}</span>
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-foreground/75">{c.preview}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-white">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
        <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" />
      </svg>
    </span>
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Grow the composer with its content, up to a cap
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [question]);

  async function handleAsk(override?: string) {
    const text = (override ?? question).trim();
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
    <div className="flex h-dvh flex-col">
      <TopBar>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          All documents
        </Link>
      </TopBar>

      <div className="border-b border-line bg-surface/40">
        <div className="mx-auto flex max-w-3xl items-center gap-3.5 px-4 py-4 sm:px-6">
          {doc ? (
            <>
              <FileBadge filename={doc.filename} size="lg" />
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-semibold" title={doc.filename}>
                  {doc.filename}
                </h1>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <StatusPill status={doc.status} />
                  <span>{doc.chunk_count} chunks indexed</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 animate-pulse rounded-lg bg-surface-2" />
              <div className="space-y-2">
                <div className="h-3.5 w-48 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-28 animate-pulse rounded bg-surface-2" />
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
          {messages.length === 0 && !thinking && (
            <div className="py-8 text-center">
              <div className="mx-auto w-fit">
                <AssistantAvatar />
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight">What would you like to know?</h2>
              <p className="mt-1 text-sm text-muted">Answers come only from this document, with sources attached.</p>
              <div className="mx-auto mt-8 grid max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleAsk(s)}
                    disabled={!chat}
                    className="rounded-xl border border-line bg-surface/60 px-4 py-3 text-left text-sm text-foreground/85 transition-all hover:-translate-y-px hover:border-accent/40 hover:bg-surface disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-br from-accent to-[#6a5ae8] px-4 py-2.5 text-sm leading-relaxed text-white shadow-lg shadow-accent/10">
                  {m.content}
                </p>
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <AssistantAvatar />
                <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{m.content}</p>
                  <CitationList message={m} />
                </div>
              </div>
            )
          )}

          {thinking && (
            <div className="flex gap-3">
              <AssistantAvatar />
              <div className="flex items-center gap-3 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-sm text-muted">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
                Searching the document…
              </div>
            </div>
          )}

          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
          <div ref={bottomRef} />
        </div>
      </main>

      <div className="border-t border-line bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-surface p-2 transition-colors focus-within:border-accent/60 focus-within:shadow-[0_0_0_4px_rgb(124_108_246/0.12)]">
            <textarea
              ref={inputRef}
              rows={1}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder={chat ? "Ask a question about this document…" : "Preparing chat…"}
              disabled={!chat || thinking}
              className="max-h-[180px] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-relaxed outline-none placeholder:text-muted/70 disabled:opacity-60"
            />
            <button
              onClick={() => handleAsk()}
              disabled={!chat || thinking || !question.trim()}
              aria-label="Send"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white transition-opacity disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted/80">
            Enter to send · Shift + Enter for a new line
          </p>
        </div>
      </div>
    </div>
  );
}
