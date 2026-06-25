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
import { isDemoMode, getDemoResponse, ChartDataset, NextAction } from "@/lib/demoData";

const ReactECharts = nextDynamic(() => import("echarts-for-react"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

function generateUUID() {
  if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

const SUGGESTIONS = [
  "Show me total shipments by region",
  "Delayed shipments by month",
  "SLA breach rate by hub",
  "Revenue breakdown by payment type",
  "Compare express vs standard delivery success",
];

const CATEGORY_STYLES: Record<NextAction["category"], string> = {
  drilldown: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40",
  chart:     "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40",
  compare:   "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40",
  export:    "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"embedded" | "fullscreen">("fullscreen");
  const [sessionId, setSessionId] = useState<string>("");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "embedded") setMode("embedded");
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

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: generateUUID(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (isDemoMode(connectionId)) {
      await new Promise((r) => setTimeout(r, 700));
      const demo = getDemoResponse(text.trim());
      setMessages((prev) => [
        ...prev,
        {
          id: generateUUID(),
          role: "agent",
          content: demo.reply,
          type: demo.type,
          charts: demo.charts,
          nextActions: demo.nextActions,
          csvHeaders: demo.csvHeaders,
          csvRows: demo.csvRows,
        },
      ]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), session_id: sessionId, connection_id: connectionId }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: generateUUID(), role: "agent", content: data.reply || "No response received.", type: data.type || "text", reportUrl: data.report_url },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: generateUUID(), role: "agent", content: "Sorry, I couldn't reach the analytics service. Please try again.", type: "text" },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, connectionId, sessionId]);

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); sendMessage(input); };
  const isEmbedded = mode === "embedded";

  return (
    <div className={`flex flex-col ${isEmbedded ? "h-screen" : "h-screen max-w-6xl mx-auto"} bg-surface-light dark:bg-surface-dark`}>

      {/* Demo banner */}
      {isDemoMode(connectionId) && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-300">
          <span>✨ <strong>Demo mode</strong> — exploring with sample logistics data. No real database connected.</span>
          <button onClick={() => router.push("/connect")} className="ml-4 px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 font-medium transition-colors whitespace-nowrap">
            Connect real DB →
          </button>
        </div>
      )}

      {/* Header */}
      {!isEmbedded && (
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-white dark:bg-surface-dark shadow-xs">
          <div className="flex items-center gap-3">
            <QuantixLogo size="sm" className="h-7 w-auto text-[var(--text-primary)]" />
            <div className="h-6 w-px bg-[var(--border-color)] mx-1" />
            <ConnectionSelector
              activeConnectionId={connectionId}
              onSelect={(id) => { setConnectionId(id); localStorage.setItem("quantixai_connection_id", id); }}
              onAdd={() => router.push("/connect")}
            />
          </div>
        </header>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
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

                  {/* Charts */}
                  {msg.charts && msg.charts.length > 0 && (
                    <div className={`mt-4 grid gap-4 not-prose ${msg.charts.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                      {msg.charts.map((chart, i) => (
                        <DemoChartCard key={i} chart={chart} />
                      ))}
                    </div>
                  )}

                  {/* CSV download */}
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

                  {/* Report iframe embed */}
                  {msg.reportUrl && (
                    <div className="mt-4 border border-[var(--border-color)] rounded-xl overflow-hidden bg-white dark:bg-surface-dark shadow-sm not-prose">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Report Preview</span>
                        <div className="flex gap-2">
                          <button onClick={() => window.open(msg.reportUrl, "_blank")} className="px-2.5 py-1 text-xs font-medium rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors">↗ Maximize</button>
                          <a href={`${API_BASE}/reports/${msg.reportUrl.split("/").pop()}/export/excel`} className="px-2.5 py-1 text-xs font-medium rounded border border-[var(--border-color)] hover:bg-muted-light dark:hover:bg-muted-dark transition-colors text-[var(--text-primary)] no-underline">📊 Excel</a>
                          <a href={`${API_BASE}/reports/${msg.reportUrl.split("/").pop()}/export/pdf`} className="px-2.5 py-1 text-xs font-medium rounded border border-[var(--border-color)] hover:bg-muted-light dark:hover:bg-muted-dark transition-colors text-[var(--text-primary)] no-underline">📄 PDF</a>
                        </div>
                      </div>
                      <div className="w-full h-[500px] bg-[var(--bg-primary)]">
                        <iframe src={`${msg.reportUrl}?mode=embedded`} className="w-full h-full border-0" title="Report Embed" />
                      </div>
                    </div>
                  )}

                  {/* ── Proactive next-action panel ── */}
                  {msg.nextActions && msg.nextActions.length > 0 && (
                    <div className="mt-4 not-prose rounded-xl border border-[var(--border-color)] bg-gray-50 dark:bg-gray-900/30 p-3">
                      <p className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">What would you like to do next?</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.nextActions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(action.message)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${CATEGORY_STYLES[action.category]}`}
                          >
                            <span>{action.icon}</span>
                            {action.label}
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
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything, or request a chart type — e.g. show as pie chart…"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
          id="chat-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          id="chat-send-btn"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
}

// ─── Chart card with type switcher + PNG download ─────────────────────────────

type ChartType = "bar" | "line" | "pie";

function DemoChartCard({ chart }: { chart: ChartDataset }) {
  const [activeType, setActiveType] = useState<ChartType>(chart.chartType);
  const echartsInstanceRef = useRef<any>(null);
  const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  const downloadPNG = () => {
    const instance = echartsInstanceRef.current;
    if (!instance) return;
    const url = instance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chart.title.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  const buildOption = (type: ChartType): object => {
    if (type === "bar") {
      return {
        tooltip: { trigger: "axis" },
        grid: { left: "3%", right: "4%", bottom: "14%", top: "12%", containLabel: true },
        xAxis: { type: "category", data: chart.labels, axisLabel: { rotate: chart.labels.length > 4 ? 30 : 0, fontSize: 11 } },
        yAxis: { type: "value", name: chart.valueLabel, nameTextStyle: { fontSize: 11 } },
        series: [{ data: chart.values, type: "bar", barMaxWidth: 48, itemStyle: { color: chart.color ?? "#6366f1", borderRadius: [4, 4, 0, 0] } }],
      };
    }
    if (type === "line") {
      return {
        tooltip: { trigger: "axis" },
        grid: { left: "3%", right: "4%", bottom: "8%", top: "12%", containLabel: true },
        xAxis: { type: "category", data: chart.labels, axisLabel: { fontSize: 11 } },
        yAxis: { type: "value", name: chart.valueLabel, nameTextStyle: { fontSize: 11 } },
        series: [{
          data: chart.values, type: "line", smooth: true, symbol: "circle", symbolSize: 6,
          lineStyle: { color: chart.color ?? "#f59e0b", width: 2 },
          itemStyle: { color: chart.color ?? "#f59e0b" },
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: (chart.color ?? "#f59e0b") + "44" }, { offset: 1, color: "transparent" }] } },
        }],
      };
    }
    // pie
    return {
      tooltip: { trigger: "item", formatter: "{b}: {d}%" },
      legend: { orient: "vertical", right: "2%", top: "middle", textStyle: { fontSize: 11 }, itemWidth: 10 },
      series: [{
        type: "pie", radius: ["38%", "65%"], center: ["38%", "50%"],
        data: chart.labels.map((l, i) => ({ name: l, value: chart.values[i], itemStyle: { color: PIE_COLORS[i % PIE_COLORS.length] } })),
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: "bold" } },
      }],
    };
  };

  const TYPE_BTNS: { type: ChartType; label: string; icon: string }[] = [
    { type: "bar",  label: "Bar",  icon: "▮▮" },
    { type: "line", label: "Line", icon: "╱╱" },
    { type: "pie",  label: "Pie",  icon: "◔" },
  ];

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white dark:bg-slate-800 p-3 shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">{chart.title}</p>
        <div className="flex items-center gap-1.5">
          {/* Chart type toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-medium">
            {TYPE_BTNS.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`px-2 py-1 transition-colors ${activeType === type ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* PNG download */}
          <button
            onClick={downloadPNG}
            title="Download chart as PNG"
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            PNG
          </button>
        </div>
      </div>

      <ReactECharts
        option={buildOption(activeType)}
        style={{ height: 220 }}
        onChartReady={(instance: any) => { echartsInstanceRef.current = instance; }}
      />
    </div>
  );
}
