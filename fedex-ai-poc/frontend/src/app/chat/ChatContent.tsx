"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

// basePath is /ai — router.push uses paths relative to basePath

import ReactMarkdown from "react-markdown";
import QuantixLogo from "@/components/QuantixLogo";
import ConnectionSelector from "@/components/ConnectionSelector";
import { api } from "@/lib/api";
import { isDemoMode, getDemoResponse } from "@/lib/demoData";

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

function extractSuggestions(text: string): { label: string; value: string }[] {
  const regex = /\(e\.g\.?,?\s*([^)]+)\)/gi;
  const matches = [...text.matchAll(regex)];
  if (matches.length === 0) return [];

  const suggestions: { label: string; value: string }[] = [];
  const seenValues = new Set<string>();

  for (const match of matches) {
    const rawItems = match[1];
    const items = rawItems
      .split(/,|\bor\b/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && !item.toLowerCase().startsWith("e.g."));

    for (const item of items) {
      let val = item.toLowerCase().replace(/[\s_-]+/g, "_");
      if (seenValues.has(val)) continue;
      seenValues.add(val);

      let label = item
        .replace(/[_-]+/g, " ")
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      if (val.includes("bar_chart")) {
        label = "📊 " + label;
        val = "bar_chart";
      } else if (val.includes("line_chart")) {
        label = "📈 " + label;
        val = "line_chart";
      } else if (val.includes("pie_chart")) {
        label = "🥧 " + label;
        val = "pie_chart";
      } else if (val.includes("table")) {
        label = "📋 " + label;
        val = "table";
      } else if (val.includes("shipment") || val.includes("delivery")) {
        label = "📦 " + label;
      } else if (val.includes("revenue") || val.includes("cost")) {
        label = "💵 " + label;
      } else if (val.includes("hub")) {
        label = "🏢 " + label;
      } else if (val.includes("city") || val.includes("state") || val.includes("region")) {
        label = "📍 " + label;
      } else if (val.includes("month") || val.includes("date") || val.includes("week") || val.includes("year")) {
        label = "📅 " + label;
      }

      suggestions.push({ label, value: val });
    }
  }

  return suggestions;
}


interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  type?: "text" | "report" | "clarification";
  reportUrl?: string;
}

const SUGGESTIONS = [
  "Show me total shipments by region",
  "Delayed shipments by month",
  "SLA breach rate by hub",
  "Revenue breakdown by payment type",
  "Compare express vs standard delivery success",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect embedded vs fullscreen mode — no auth context parsing
  const [mode, setMode] = useState<"embedded" | "fullscreen">("fullscreen");

  const [sessionId, setSessionId] = useState<string>("");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "embedded") {
      setMode("embedded");
    }
    
    let sid = sessionStorage.getItem("chat_session_id");
    if (!sid) {
      sid = generateUUID();
      sessionStorage.setItem("chat_session_id", sid);
    }
    setSessionId(sid);
    const connId = localStorage.getItem("quantixai_connection_id");
    if (!connId) { router.push("/connect"); return; }
    setConnectionId(connId); // "demo" is a valid connection ID handled by demo mode
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: generateUUID(),
      role: "user",
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (isDemoMode(connectionId)) {
      // Simulate a short thinking delay for realism
      await new Promise(r => setTimeout(r, 800));
      const demo = getDemoResponse(text.trim());
      setMessages((prev) => [
        ...prev,
        { id: generateUUID(), role: "agent", content: demo.reply, type: demo.type },
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

      const agentMsg: Message = {
        id: generateUUID(),
        role: "agent",
        content: data.reply || "No response received.",
        type: data.type || "text",
        reportUrl: data.report_url,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateUUID(),
          role: "agent",
          content: "Sorry, I couldn't reach the analytics service. Please try again.",
          type: "text",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isEmbedded = mode === "embedded";

  return (
    <div className={`flex flex-col ${isEmbedded ? "h-screen" : "h-screen max-w-6xl mx-auto"} bg-surface-light dark:bg-surface-dark`}>
      {/* Demo mode banner */}
      {isDemoMode(connectionId) && (
        <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-300">
          <span>✨ <strong>Demo mode</strong> — exploring with sample logistics data. No real database connected.</span>
          <button
            onClick={() => router.push("/connect")}
            className="ml-4 px-3 py-1 rounded-full bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 font-medium transition-colors whitespace-nowrap"
          >
            Connect real DB →
          </button>
        </div>
      )}

      {/* Header — hidden in embedded mode */}
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

      {/* Chat messages */}
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
              <p className="text-sm text-[var(--text-secondary)]">
                Ask anything about your data — shipments, revenue, SLA metrics, trends, and more.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-2 text-sm rounded-full border border-[var(--border-color)] hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} ${msg.reportUrl ? "w-full" : ""}`}>
            <div className={
              msg.role === "user"
                ? "chat-bubble-user"
                : msg.reportUrl
                  ? "bg-muted-light dark:bg-muted-dark text-primary-900 dark:text-primary-100 rounded-2xl rounded-bl-md px-4 py-3 w-full max-w-full"
                  : "chat-bubble-agent"
            }>
              {msg.role === "agent" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      a: ({ node, ...props }) => (
                        <a target="_blank" rel="noopener noreferrer" {...props} />
                      )
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  
                  {/* Dynamically parsed suggestion CTA chips */}
                  {(() => {
                    const suggestions = extractSuggestions(msg.content);
                    if (suggestions.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {suggestions.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => sendMessage(s.value)}
                            className="px-3.5 py-1.5 rounded-full border border-primary-500 bg-white dark:bg-surface-dark hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-colors text-xs font-semibold text-primary-700 dark:text-primary-400 flex items-center gap-1.5 shadow-sm"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}


                  {msg.reportUrl && (
                    <div className="mt-4 border border-[var(--border-color)] rounded-xl overflow-hidden bg-white dark:bg-surface-dark shadow-sm max-w-full">
                      {/* Embed Header */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">Report Preview</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(msg.reportUrl, "_blank")}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center gap-1"
                            title="Maximize view"
                          >
                            ↗ Maximize
                          </button>
                          <a
                            href={`${API_BASE}/reports/${msg.reportUrl.split("/").pop()}/export/excel`}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-[var(--border-color)] hover:bg-muted-light dark:hover:bg-muted-dark transition-colors flex items-center gap-1 text-[var(--text-primary)] no-underline"
                            title="Download Excel"
                          >
                            📊 Excel
                          </a>
                          <a
                            href={`${API_BASE}/reports/${msg.reportUrl.split("/").pop()}/export/pdf`}
                            className="px-2.5 py-1 text-xs font-medium rounded border border-[var(--border-color)] hover:bg-muted-light dark:hover:bg-muted-dark transition-colors flex items-center gap-1 text-[var(--text-primary)] no-underline"
                            title="Download PDF"
                          >
                            📄 PDF
                          </a>
                        </div>
                      </div>
                      {/* Embed Body (IFrame) */}
                      <div className="w-full h-[500px] bg-[var(--bg-primary)]">
                        <iframe
                          src={`${msg.reportUrl}?mode=embedded`}
                          className="w-full h-full border-0"
                          title="Report Embed"
                        />
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
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your data..."
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
