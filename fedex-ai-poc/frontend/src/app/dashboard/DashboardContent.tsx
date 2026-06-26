"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import nextDynamic from "next/dynamic";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactECharts = nextDynamic(() => import("echarts-for-react"), { ssr: false });

// WidthProvider + Responsive loaded together so WidthProvider wraps correctly
const ResponsiveGridLayout = nextDynamic(
  () => import("react-grid-layout").then((m) => {
    const { Responsive, WidthProvider } = m;
    return WidthProvider(Responsive);
  }),
  { ssr: false }
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const PIE_COLORS = ["#6366f1","#f59e0b","#22c55e","#ec4899","#14b8a6","#f97316","#8b5cf6","#06b6d4"];

type ChartType = "bar" | "line" | "pie";

interface Widget {
  widget_id: string;
  chart_title: string;
  chart_type: ChartType;
  labels: string[];
  values: number[];
  value_label: string;
  color: string;
  description: string;
  layout: { x: number; y: number; w: number; h: number };
  created_at: number;
}

function buildOption(widget: Widget, type: ChartType): object {
  if (type === "bar") return {
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "14%", top: "12%", containLabel: true },
    xAxis: { type: "category", data: widget.labels, axisLabel: { rotate: widget.labels.length > 5 ? 30 : 0, fontSize: 11 } },
    yAxis: { type: "value", name: widget.value_label, nameTextStyle: { fontSize: 11 } },
    series: [{ data: widget.values, type: "bar", barMaxWidth: 48, itemStyle: { color: widget.color || "#6366f1", borderRadius: [4,4,0,0] } }],
  };
  if (type === "line") return {
    tooltip: { trigger: "axis" },
    grid: { left: "3%", right: "4%", bottom: "8%", top: "12%", containLabel: true },
    xAxis: { type: "category", data: widget.labels, axisLabel: { fontSize: 11 } },
    yAxis: { type: "value", name: widget.value_label, nameTextStyle: { fontSize: 11 } },
    series: [{ data: widget.values, type: "line", smooth: true, symbol: "circle", symbolSize: 6,
      lineStyle: { color: widget.color || "#6366f1", width: 2 },
      itemStyle: { color: widget.color || "#6366f1" },
      areaStyle: { color: { type: "linear", x:0,y:0,x2:0,y2:1, colorStops:[{ offset:0, color:(widget.color||"#6366f1")+"44"},{ offset:1, color:"transparent"}] } } }],
  };
  return {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { orient: "vertical", right: "2%", top: "middle", textStyle: { fontSize: 11 }, itemWidth: 10 },
    series: [{ type: "pie", radius: ["38%","65%"], center: ["38%","50%"],
      data: widget.labels.map((l, i) => ({ name: l, value: widget.values[i], itemStyle: { color: PIE_COLORS[i % PIE_COLORS.length] } })),
      label: { show: false }, emphasis: { label: { show: true, fontSize: 12, fontWeight: "bold" } } }],
  };
}

function WidgetCard({
  widget, readOnly, onDelete, onDescriptionSave,
}: {
  widget: Widget; readOnly: boolean;
  onDelete: (id: string) => void;
  onDescriptionSave: (id: string, desc: string) => void;
}) {
  const [activeType, setActiveType] = useState<ChartType>(widget.chart_type);
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(widget.description);
  const echartsRef = useRef<any>(null);

  const dl = (action: () => void) => action;

  const downloadPNG = () => {
    const inst = echartsRef.current;
    if (!inst) return;
    const url = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
    const a = document.createElement("a"); a.href = url; a.download = `${widget.chart_title}.png`; a.click();
  };
  const downloadExcel = async () => {
    const XLSX = (await import("xlsx")).default;
    const rows = widget.labels.map((l, i) => ({ Label: l, [widget.value_label || "Value"]: widget.values[i] }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${widget.chart_title}.xlsx`);
  };
  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const inst = echartsRef.current;
    if (!inst) return;
    const imgData = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(13); doc.setTextColor(40);
    doc.text(widget.chart_title, 14, 14);
    if (desc) { doc.setFontSize(9); doc.setTextColor(100); doc.text(desc, 14, 22); }
    doc.addImage(imgData, "PNG", 14, desc ? 28 : 22, pageW - 28, pageH - (desc ? 38 : 32));
    doc.save(`${widget.chart_title}.pdf`);
  };

  const DL_BTN = "flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors";

  return (
    <div className="flex flex-col w-full h-full bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Drag handle + header */}
      <div className="drag-handle cursor-grab active:cursor-grabbing flex items-start justify-between px-4 pt-3 pb-2 gap-2 flex-wrap bg-white dark:bg-slate-800 flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug select-none">{widget.chart_title}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-medium">
            {(["bar","line","pie"] as ChartType[]).map((t) => (
              <button key={t} onClick={e => { e.stopPropagation(); setActiveType(t); }}
                className={`px-2 py-1 capitalize transition-colors ${activeType === t ? "bg-indigo-600 text-white" : "bg-white dark:bg-slate-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-700"}`}>
                {t}
              </button>
            ))}
          </div>
          {!readOnly && (
            <button onClick={() => onDelete(widget.widget_id)}
              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pb-1 flex-shrink-0">
        {editingDesc ? (
          <div className="flex gap-2">
            <input autoFocus value={desc} onChange={e => setDesc(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setEditingDesc(false); onDescriptionSave(widget.widget_id, desc); } if (e.key === "Escape") { setEditingDesc(false); setDesc(widget.description); }}}
              className="flex-1 text-xs px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Add a description…" />
            <button onClick={() => { setEditingDesc(false); onDescriptionSave(widget.widget_id, desc); }}
              className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
          </div>
        ) : (
          <button onClick={() => !readOnly && setEditingDesc(true)}
            className={`text-xs text-left w-full ${desc ? "text-gray-500 dark:text-gray-400" : "text-gray-300 dark:text-gray-600 italic"} ${!readOnly ? "hover:text-indigo-500 cursor-text" : "cursor-default"}`}>
            {desc || (readOnly ? "" : "Click to add description…")}
          </button>
        )}
      </div>

      {/* Chart — flex-1 so it fills remaining height */}
      <div className="flex-1 px-2 min-h-0">
        <ReactECharts
          option={buildOption(widget, activeType)}
          style={{ height: "100%", minHeight: 180 }}
          onChartReady={(inst: any) => { echartsRef.current = inst; }}
        />
      </div>

      {/* Download bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/40 flex-shrink-0">
        <span className="text-[11px] text-gray-400 mr-1">Download:</span>
        <button onClick={downloadPNG} className={DL_BTN}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>PNG
        </button>
        <button onClick={downloadExcel} className={DL_BTN}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Excel
        </button>
        <button onClick={downloadPDF} className={DL_BTN}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>PDF
        </button>
      </div>
    </div>
  );
}

export default function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shareId = searchParams.get("share");

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyDone, setCopyDone] = useState(false);
  const [savingLayout, setSavingLayout] = useState(false);
  const layoutSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readOnly = !!shareId;

  useEffect(() => {
    const email = localStorage.getItem("quantixai_user_email");
    if (!shareId && !email) { router.push("/login"); return; }
    setUserEmail(email);

    const url = shareId
      ? `${API_BASE}/dashboard/shared/${shareId}`
      : `${API_BASE}/dashboard/${email}`;

    fetch(url)
      .then(r => r.json())
      .then(d => { setWidgets(d.widgets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [shareId]);

  const handleDelete = useCallback(async (widgetId: string) => {
    if (!userEmail) return;
    setWidgets(w => w.filter(x => x.widget_id !== widgetId));
    await fetch(`${API_BASE}/dashboard/${userEmail}/widget/${widgetId}`, { method: "DELETE" });
  }, [userEmail]);

  const handleDescSave = useCallback(async (widgetId: string, desc: string) => {
    if (!userEmail) return;
    setWidgets(w => w.map(x => x.widget_id === widgetId ? { ...x, description: desc } : x));
    await fetch(`${API_BASE}/dashboard/${userEmail}/widget/${widgetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: desc }),
    });
  }, [userEmail]);

  const handleLayoutChange = useCallback((_: any, allLayouts: any) => {
    if (!userEmail) return;
    const lg = allLayouts?.lg || [];
    if (!lg.length) return;
    setWidgets(w => w.map(x => {
      const l = lg.find((ll: any) => ll.i === x.widget_id);
      if (!l) return x;
      return { ...x, layout: { x: l.x, y: l.y, w: l.w, h: l.h } };
    }));
    if (layoutSaveTimer.current) clearTimeout(layoutSaveTimer.current);
    setSavingLayout(true);
    layoutSaveTimer.current = setTimeout(async () => {
      await fetch(`${API_BASE}/dashboard/${userEmail}/layouts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layouts: lg }),
      });
      setSavingLayout(false);
    }, 1200);
  }, [userEmail]);

  const handleShare = async () => {
    if (!userEmail) return;
    const res = await fetch(`${API_BASE}/dashboard/${userEmail}/share`, { method: "POST" });
    const data = await res.json();
    const url = `${window.location.origin}/dashboard?share=${data.share_id}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 3000);
  };

  const layouts = {
    lg: widgets.map(w => ({ i: w.widget_id, x: w.layout.x, y: w.layout.y, w: w.layout.w, h: w.layout.h, minW: 3, minH: 4 })),
    md: widgets.map(w => ({ i: w.widget_id, x: w.layout.x % 8, y: w.layout.y, w: Math.min(w.layout.w, 8), h: w.layout.h, minW: 3, minH: 4 })),
    sm: widgets.map(w => ({ i: w.widget_id, x: 0, y: w.layout.y, w: 6, h: w.layout.h, minW: 3, minH: 4 })),
    xs: widgets.map(w => ({ i: w.widget_id, x: 0, y: w.layout.y, w: 4, h: w.layout.h, minW: 2, minH: 4 })),
    xxs: widgets.map(w => ({ i: w.widget_id, x: 0, y: w.layout.y, w: 2, h: w.layout.h, minW: 2, minH: 4 })),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/chat")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs">Q</div>
          <span className="font-semibold text-sm text-gray-900 dark:text-white">
            {readOnly ? "Shared Dashboard" : "My Dashboard"}
          </span>
          {widgets.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {widgets.length} chart{widgets.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {savingLayout && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
          {!readOnly && widgets.length > 0 && (
            <button onClick={handleShare}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${copyDone ? "bg-green-50 border-green-200 text-green-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300 hover:text-indigo-600"}`}>
              {copyDone
                ? <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Copied!</>
                : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>Share</>
              }
            </button>
          )}
          {!readOnly && (
            <button onClick={() => router.push("/chat")}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl transition-colors">
              + Add charts
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-gray-400">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading dashboard…
          </div>
        ) : widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-3xl mb-4">📊</div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {readOnly ? "This dashboard has no charts yet" : "Your dashboard is empty"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-6">
              {readOnly
                ? "The owner hasn't added any charts."
                : "Go to chat, ask for a chart, then click \"Add to Dashboard\"."}
            </p>
            {!readOnly && (
              <button onClick={() => router.push("/chat")}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
                Go to chat →
              </button>
            )}
          </div>
        ) : (
          <>
            {!readOnly && (
              <p className="text-xs text-gray-400 mb-3">Drag header to reposition · Drag corner to resize</p>
            )}
            <ResponsiveGridLayout
              className="layout"
              layouts={layouts}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={80}
              isDraggable={!readOnly}
              isResizable={!readOnly}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".drag-handle"
              margin={[16, 16]}
              containerPadding={[0, 0]}
            >
              {widgets.map(widget => (
                <div key={widget.widget_id} style={{ overflow: "hidden" }}>
                  <WidgetCard
                    widget={widget}
                    readOnly={readOnly}
                    onDelete={handleDelete}
                    onDescriptionSave={handleDescSave}
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          </>
        )}
      </main>
    </div>
  );
}
