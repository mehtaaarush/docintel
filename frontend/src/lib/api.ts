const API = process.env.NEXT_PUBLIC_API_URL;

export type Doc = {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: string;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
};

export type Citation = {
  index: number;
  chunk_id: string;
  page_number: number | null;
  score: number;
  preview: string;
};

export type Message = {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  citations: string | null;
  created_at: string;
};

export type Chat = {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  messages: Message[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  listDocuments: () => request<Doc[]>("/documents"),

  getDocument: (id: string) => request<Doc>(`/documents/${id}`),

  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<Doc>("/documents/upload", { method: "POST", body: formData });
  },

  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),

  createChat: (documentId: string) =>
    request<Chat>("/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId }),
    }),

  getChat: (id: string) => request<Chat>(`/chats/${id}`),

  ask: (chatId: string, question: string) =>
    request<{ user_message: Message; assistant_message: Message }>(
      `/chats/${chatId}/ask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      }
    ),
};

export function parseCitations(raw: string | null): Citation[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
