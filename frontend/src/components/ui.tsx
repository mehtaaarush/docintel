import Link from "next/link";
import type { ReactNode } from "react";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_20px_-4px_rgb(124_108_246/0.6)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">DocIntel</span>
    </Link>
  );
}

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <div className="flex min-w-0 items-center gap-3">{children}</div>
      </div>
    </header>
  );
}

const STATUS_STYLES: Record<string, { label: string; dot: string; pill: string; pulse?: boolean }> = {
  ready: { label: "Ready", dot: "bg-emerald-400", pill: "text-emerald-300 bg-emerald-400/10 ring-emerald-400/20" },
  processing: { label: "Indexing", dot: "bg-amber-400", pill: "text-amber-300 bg-amber-400/10 ring-amber-400/20", pulse: true },
  uploaded: { label: "Queued", dot: "bg-sky-400", pill: "text-sky-300 bg-sky-400/10 ring-sky-400/20", pulse: true },
  failed: { label: "Failed", dot: "bg-red-400", pill: "text-red-300 bg-red-400/10 ring-red-400/20" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? {
    label: status,
    dot: "bg-zinc-400",
    pill: "text-zinc-300 bg-zinc-400/10 ring-zinc-400/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.pill}`}>
      <span className="relative flex h-1.5 w-1.5">
        {s.pulse && <span className={`absolute inset-0 animate-ping rounded-full opacity-75 ${s.dot}`} />}
        <span className={`relative h-1.5 w-1.5 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}

const TYPE_COLORS: Record<string, string> = {
  pdf: "from-rose-500/25 to-rose-500/5 text-rose-300 ring-rose-400/20",
  docx: "from-sky-500/25 to-sky-500/5 text-sky-300 ring-sky-400/20",
  md: "from-violet-500/25 to-violet-500/5 text-violet-300 ring-violet-400/20",
  txt: "from-zinc-400/25 to-zinc-400/5 text-zinc-300 ring-zinc-400/20",
};

export function FileBadge({ filename, size = "md" }: { filename: string; size?: "md" | "lg" }) {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const color = TYPE_COLORS[ext] ?? TYPE_COLORS.txt;
  const dims = size === "lg" ? "h-11 w-11 text-[11px]" : "h-10 w-10 text-[10px]";
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg bg-gradient-to-b font-mono font-semibold uppercase ring-1 ring-inset ${dims} ${color}`}>
      {ext || "doc"}
    </span>
  );
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300">
      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-300/60 hover:text-red-200" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}
