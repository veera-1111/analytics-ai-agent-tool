const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export interface ConnectionResult {
  connection_id: string;
  display_name: string;
  db_type: string;
  table_count: number;
  status: string;
}

export interface ConnectionMeta {
  connection_id: string;
  display_name: string;
  db_type: string;
  host: string | null;
  database: string | null;
  username: string | null;
  table_count: number;
  created_at: string;
}

export interface ChatResult {
  reply: string;
  type: string;
  report_id: string | null;
  report_url: string | null;
  sql_query: string | null;
  session_id: string;
}

export interface ExportResult {
  url: string;
  expires_in: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err?.detail?.error || err?.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  testConnection: (data: Record<string, unknown>) =>
    request<{ status: string }>("/connections/test", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  saveConnection: (data: Record<string, unknown>) =>
    request<ConnectionResult>("/connections", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listConnections: () => request<ConnectionMeta[]>("/connections"),

  deleteConnection: (id: string) =>
    fetch(`${API_BASE}/connections/${id}`, { method: "DELETE" }),

  sendChat: (data: { message: string; session_id?: string; connection_id: string }) =>
    request<ChatResult>("/chat", { method: "POST", body: JSON.stringify(data) }),

  getReport: (id: string) => request<unknown>(`/reports/${id}`),

  exportReport: (id: string, format: "excel" | "pdf") =>
    request<ExportResult>(`/reports/${id}/export/${format}`),
};
