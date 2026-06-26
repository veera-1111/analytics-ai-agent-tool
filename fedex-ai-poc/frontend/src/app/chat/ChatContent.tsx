"use client";
export const dynamic = "force-dynamic";

import { useState, useRef, useEffect, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import nextDynamic from "next/dynamic";
import QuantixLogo from "@/components/QuantixLogo";
import ConnectionSelector from "@/components/ConnectionSelector";
import { api } from "@/lib/api";
import { isDemoMode, ChartDataset, NextAction } from "@/lib/demoData";

const ReactECharts = nextDynamic(() => import("echarts-for-react"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

function generateUUID() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function formatRelativeDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  type?: "text" | "report" | "clarification";
  reportUrl?: string;
  charts?: ChartDataset[];
  nextActions?: NextAction[];
  csvHeaders?: string[];
  csvRows?: string[][];
}

interface PastSession {
  session_id: string;
  first_message: string;
  started_at: string;
  last_active: string;
  connection_name: string;
}

const SUGGESTIONS = [
  "Show me total shipments by region",
  "Delayed shipments by month",
  "SLA breach rate by hub",
  "Revenue breakdown by payment type",
  "Compare express vs standard delivery",
];

const CATEGORY_STYLES: Record<NextAction["category"], string> = {
  drilldown: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100",
  chart:     "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100",
  compare:   "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100",
  export:    "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"embedded" | "fullscreen">("fullscreen");
  const [sessionId, setSessionId] = useState<string>("");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  // History sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "embedded") setMode("embedded");

    const email = localStorage.getItem("quantixai_user_email") || "";
    if (!email) { router.push("/login"); return; }
    setUserEmail(email);

    let sid = sessionStorage.getItem("chat_session_id");
    if (!sid) { sid = generateUUID(); sessionStorage.setItem("chat_session_id", sid); }
    setSessionId(sid);

    const connId = localStorage.getItem("quantixai_connection_id");
    if (!connId) { router.push("/connect"); return; }
    setConnectionId(connId);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load history when sidebar opens
  useEffect(() => {
    if (!sidebarOpen || !userEmail) return;
    setHistoryLoading(true);
    fetch(`${API_BASE}/history/${encodeURIComponent(userEmail)}`)
      .then((r) => r.json())
      .then((d) => setPastSessions(d.sessions || []))
      .catch(() => setPastSessions([]))
      .finally(() => setHistoryLoading(false));
  }, [sidebarOpen, userEmail]);

  // Restore a past session
  const loadSession = async (sid: string) => {
    setLoadingSessionId(sid);
    try {
      const res = await fetch(`${API_BASE}/history/${encodeURIComponent(userEmail)}/session/${sid}`);
      const data = await res.json();
      const restored: Message[] = (data.messages || []).map((m: any) => ({
        id: generateUUID(),
        role: m.role === "assistant" ? "agent" : m.role,
        content: m.content,
        type: "text",
      }));
      setMessages(restored);
      sessionStorage.setItem("chat_session_id", sid);
      setSessionId(sid);
      setSidebarOpen(false);
    } finally {
      setLoadingSessionId(null);
    }
  };

  const startNewSession = () => {
    const sid = generateUUID();
    sessionStorage.setItem("chat_session_id", sid);
    setSessionId(sid);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleSignOut = () => {
    localStorage.removeItem("quantixai_user_email");
    sessionStorage.removeItem("chat_session_id");
    router.push("/login");
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { id: generateUUID(), role: "user", content: text.trim() }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          session_id: sessionId,
          connection_id: connectionId,
          user_email: userEmail || undefined,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        id: generateUUID(), role: "agent",
        content: data.reply || "No response received.",
        type: data.type || "text",
        reportUrl: data.report_url,
        charts: data.charts?.length ? data.charts : undefined,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: generateUUID(), role: "agent",
        content: "Sorry, I couldn't reach the analytics service. Please try again.", type: "text",
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, connectionId, sessionId, userEmail]);

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); sendMessage(input); };
  const isEmbedded = mode === "embedded";

  return (
    <div className={`flex ${isEmbedded ? "h-screen" : "h-screen"} bg-[var(--bg-primary)]`}>

      {/* ── History Sidebar ── */}
      {sidebarOpen && (
        <aside className="w-72 flex-shrink-0 border-r border-[var(--border-color)] bg-white dark:bg-slate-900 flex flex-col h-full z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
            <span className="text-sm font-semibold">Conversation History</span>
            <button onClick={() => setSidebarOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="px-3 py-2 border-b border-[var(--border-color)]">
            <button
              onClick={startNewSession}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
              </div>
            ) : pastSessions.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] text-center py-8 px-4">No past conversations yet. Start chatting!</p>
            ) : (
              pastSessions.map((s) => (
                <button
                  key={s.session_id}
                  onClick={() => loadSession(s.session_id)}
                  disabled={loadingSessionId === s.session_id}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-[var(--border-color)] last:border-0 ${sessionId === s.session_id ? "bg-primary-50 dark:bg-primary-900/20" : ""}`}
                >
                  {loadingSessionId === s.session_id ? (
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <div className="w-3 h-3 border border-primary-400 border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{s.first_message || "Conversation"}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{formatRelativeDate(s.last_active)}</p>
                    </>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] truncate">
            {userEmail}
          </div>
        </aside>
      )}

      {/* ── Main chat area ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Demo banner */}
        {isDemoMode(connectionId) && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-300">
            <span>✨ <strong>Demo mode</strong> — exploring with sample logistics data.</span>
            <button onClick={() => router.push("/connect")} className="ml-4 px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 font-medium transition-colors whitespace-nowrap">
              Connect real DB →
            </button>
          </div>
        )}

        {/* Header */}
        {!isEmbedded && (
          <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-white dark:bg-slate-900 shadow-xs flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* History toggle */}
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                title="Conversation history"
                className={`p-1.5 rounded-lg transition-colors ${sidebarOpen ? "bg-primary-100 text-primary-700" : "text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-slate-800"}`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </button>

              <QuantixLogo size="sm" className="h-7 w-auto text-[var(--text-primary)]" />
              <div className="h-5 w-px bg-[var(--border-color)]" />
              <ConnectionSelector
                activeConnectionId={connectionId}
                onSelect={(id) => { setConnectionId(id); localStorage.setItem("quantixai_connection_id", id); }}
                onAdd={() => router.push("/connect")}
              />
            </div>

            {/* User pill + sign out */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 text-xs text-[var(--text-secondary)]">
                <div className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                  {userEmail[0] || "?"}
                </div>
                <span className="max-w-[160px] truncate">{userEmail}</span>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </header>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">
                  {userEmail ? `Hi ${userEmail.split("@")[0]}! ` : ""}How can I help you today?
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">Ask anything about your data — shipments, revenue, SLA metrics, trends, and more.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => sendMessage(s)} className="px-3 py-2 text-sm rounded-full border border-[var(--border-color)] hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start w-full"}`}>
              <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-agent w-full max-w-full"}>
                {msg.role === "agent" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
                        table: ({ node, ...props }) => <div className="overflow-x-auto my-3"><table className="min-w-full text-xs border-collapse" {...props} /></div>,
                        th: ({ node, ...props }) => <th className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-left font-semibold border border-gray-200 dark:border-gray-700" {...props} />,
                        td: ({ node, ...props }) => <td className="px-3 py-2 border border-gray-200 dark:border-gray-700" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>

                    {msg.charts && msg.charts.length > 0 && (
                      <div className={`mt-4 grid gap-4 not-prose ${msg.charts.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                        {msg.charts.map((chart, i) => <DemoChartCard key={i} chart={chart} />)}
                      </div>
                    )}

                    {msg.csvHeaders && msg.csvRows && (
                      <div className="mt-3 not-prose">
                        <button
                          onClick={() => downloadCSV(msg.csvHeaders!, msg.csvRows!, `report-${msg.id.slice(0, 8)}.csv`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download CSV
                        </button>
                      </div>
                    )}

                    {msg.reportUrl && (
                      <div className="mt-4 border border-[var(--border-color)] rounded-xl overflow-hidden bg-white dark:bg-surface-dark shadow-sm not-prose">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                          <span className="text-xs font-semibold">Report Preview</span>
                          <div className="flex gap-2">
                            <button onClick={() => window.open(msg.reportUrl, "_blank")} className="px-2.5 py-1 text-xs font-medium rounded bg-primary-600 text-white hover:bg-primary-700">↗ Maximize</button>
                            <a href={`${API_BASE}/reports/${msg.reportUrl.split("/").pop()}/export/excel`} className="px-2.5 py-1 text-xs font-medium rounded border border-[var(--border-color)] hover:bg-gray-50 text-[var(--text-primary)] no-underline">📊 Excel</a>
                            <a href={`${API_BASE}/reports/${msg.reportUrl.split("/").pop()}/export/pdf`} className="px-2.5 py-1 text-xs font-medium rounded border border-[var(--border-color)] hover:bg-gray-50 text-[var(--text-primary)] no-underline">📄 PDF</a>
                          </div>
                        </div>
                        <div className="w-full h-[500px]">
                          <iframe src={`${msg.reportUrl}?mode=embedded`} className="w-full h-full border-0" title="Report" />
                        </div>
                      </div>
                    )}

                    {msg.nextActions && msg.nextActions.length > 0 && (
                      <div className="mt-4 not-prose rounded-xl border border-[var(--border-color)] bg-gray-50 dark:bg-gray-900/30 p-3">
                        <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">What would you like to do next?</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.nextActions.map((action, i) => (
                            <button key={i} onClick={() => sendMessage(action.message)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${CATEGORY_STYLES[action.category]}`}>
                              <span>{action.icon}</span>{action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="chat-bubble-agent flex gap-1.5 py-4">
                <span className="loading-dot w-2 h-2 rounded-full bg-primary-400" />
                <span className="loading-dot w-2 h-2 rounded-full bg-primary-400" />
                <span className="loading-dot w-2 h-2 rounded-full bg-primary-400" />
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex-shrink-0">
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your data…"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Chart card ────────────────────────────────────────────────────────────────
type ChartType = "bar" | "line" | "pie";
const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function DemoChartCard({ chart }: { chart: ChartDataset }) {
  const [activeType, setActiveType] = useState<ChartType>(chart.chartType);
  const echartsInstanceRef = useRef<any>(null);
  const slug = chart.title.replace(/\s+/g, "-").toLowerCase();

  const downloadPNG = () => {
    const instance = echartsInstanceRef.current;
    if (!instance) return;
    const url = instance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
    const a = document.createElement("a"); a.href = url; a.download = `${slug}.png`; a.click();
  };

  const downloadExcel = async () => {
    const XLSX = (await import("xlsx")).default;
    const rows = chart.labels.map((label, i) => ({ [chart.title]: label, [chart.valueLabel || "Value"]: chart.values[i] }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chart Data");
    XLSX.writeFile(wb, `${slug}.xlsx`);
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const instance = echartsInstanceRef.current;
    if (!instance) return;
    const imgData = instance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(13);
    doc.setTextColor(40);
    doc.text(chart.title, 14, 14);
    doc.addImage(imgData, "PNG", 14, 20, pageW - 28, pageH - 32);
    doc.save(`${slug}.pdf`);
  };

  const buildOption = (type: ChartType): object => {
    if (type === "bar") return {
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "14%", top: "12%", containLabel: true },
      xAxis: { type: "category", data: chart.labels, axisLabel: { rotate: chart.labels.length > 5 ? 30 : 0, fontSize: 11 } },
      yAxis: { type: "value", name: chart.valueLabel, nameTextStyle: { fontSize: 11 } },
      series: [{ data: chart.values, type: "bar", barMaxWidth: 48, itemStyle: { color: chart.color ?? "#6366f1", borderRadius: [4, 4, 0, 0] } }],
    };
    if (type === "line") return {
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "8%", top: "12%", containLabel: true },
      xAxis: { type: "category", data: chart.labels, axisLabel: { fontSize: 11 } },
      yAxis: { type: "value", name: chart.valueLabel, nameTextStyle: { fontSize: 11 } },
      series: [{ data: chart.values, type: "line", smooth: true, symbol: "circle", symbolSize: 6,
        lineStyle: { color: chart.color ?? "#f59e0b", width: 2 }, itemStyle: { color: chart.color ?? "#f59e0b" },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: (chart.color ?? "#f59e0b") + "44" }, { offset: 1, color: "transparent" }] } } }],
    };
    return {
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      legend: { orient: "vertical", right: "2%", top: "middle", textStyle: { fontSize: 11 }, itemWidth: 10 },
      series: [{ type: "pie", radius: ["38%", "65%"], center: ["38%", "50%"],
        data: chart.labels.map((l, i) => ({ name: l, value: chart.values[i], itemStyle: { color: PIE_COLORS[i % PIE_COLORS.length] } })),
        label: { show: false }, emphasis: { label: { show: true, fontSize: 12, fontWeight: "bold" } } }],
    };
  };

  const DL_BTN = "flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors";

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white dark:bg-slate-800 p-3 shadow-sm">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{chart.title}</p>

        {/* Chart type switcher */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-medium flex-shrink-0">
          {(["bar", "line", "pie"] as ChartType[]).map((t) => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`px-2.5 py-1 capitalize transition-colors ${activeType === t ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ReactECharts option={buildOption(activeType)} style={{ height: 240 }}
        onChartReady={(instance: any) => { echartsInstanceRef.current = instance; }} />

      {/* Download bar */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <span className="text-[11px] text-[var(--text-secondary)] mr-1">Download:</span>
        <button onClick={downloadPNG} className={DL_BTN}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          PNG
        </button>
        <button onClick={downloadExcel} className={DL_BTN}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Excel
        </button>
        <button onClick={downloadPDF} className={DL_BTN}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          PDF
        </button>
      </div>
    </div>
  );
}
