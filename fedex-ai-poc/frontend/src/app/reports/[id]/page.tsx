"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

// Dynamic imports for heavy chart/grid libs
const AgGridReact = dynamic(
  () => import("ag-grid-react").then((mod) => mod.AgGridReact),
  { ssr: false }
);
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface ReportMeta {
  id: number;
  title: string;
  config: {
    metrics: string[];
    dimensions: string[];
    visualization: string;
    filters: any[];
  };
  layout: { visualization: string };
  created_at: string;
}

interface ReportData {
  columns: string[];
  data: Record<string, any>[];
  visualization: string;
  total_rows: number;
}

export default function ReportPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const reportId = params?.id as string;
  const isEmbedded = searchParams?.get("mode") === "embedded";

  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [datasets, setDatasets] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<"single" | "split" | "multi_chart">("single");

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        const metaRes = await fetch(`${API_BASE}/reports/${reportId}`);
        if (!metaRes.ok) {
          setError("Failed to load report");
          return;
        }
        const metaJson = await metaRes.json();
        setMeta(metaJson);

        const dims = metaJson.config.dimensions || [];
        const datasetsMap: Record<string, any> = {};

        // Fetch data for each dimension individually
        await Promise.all(
          dims.map(async (d: string) => {
            const res = await fetch(`${API_BASE}/reports/${reportId}/data?dimension=${d}`);
            if (res.ok) {
              datasetsMap[d] = await res.json();
            }
          })
        );
        setDatasets(datasetsMap);

        // Fetch standard aggregated report data
        const dataRes = await fetch(`${API_BASE}/reports/${reportId}/data`);
        if (dataRes.ok) {
          setReportData(await dataRes.json());
        } else {
          setError("Failed to load report data");
          return;
        }
      } catch {
        setError("Could not connect to analytics service");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !meta || !reportData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error || "Report not found"}</p>
      </div>
    );
  }

  const viz = reportData.visualization || "table";

  return (
    <div className={`${isEmbedded ? "" : "min-h-screen"} bg-surface-light dark:bg-surface-dark`}>
      {/* Header */}
      {!isEmbedded && (
        <header className="border-b border-[var(--border-color)] px-6 py-4 bg-white dark:bg-surface-dark shadow-xs">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <svg className="h-8 w-auto" viewBox="0 0 120 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Corner brackets */}
                <path d="M2 8V2H8" stroke="#4ca649" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M22 8V2H16" stroke="#c27a39" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M2 16v6h6" stroke="#c27a39" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M22 16v6h-6" stroke="#4ca649" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Dots inside brackets */}
                <circle cx="8" cy="8" r="1.5" fill="#4ca649" />
                <circle cx="16" cy="8" r="1.5" fill="#c27a39" />
                <circle cx="8" cy="16" r="1.5" fill="#c27a39" />
                <circle cx="16" cy="16" r="1.5" fill="#4ca649" />

                <text x="32" y="18" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="800" fill="currentColor" className="text-[var(--text-primary)]">Open</text>
                <text x="71" y="18" fontFamily="system-ui, -apple-system, sans-serif" fontSize="15" fontWeight="400" fill="currentColor" className="text-[var(--text-primary)]">Dhi</text>
              </svg>
              <div className="h-6 w-px bg-[var(--border-color)] mx-1" />
              <div>
                <h1 className="text-sm font-semibold text-[var(--text-primary)]">{meta.title}</h1>
                <p className="text-[10px] text-[var(--text-secondary)] leading-none mt-0.5">
                  Generated {new Date(meta.created_at).toLocaleString()} · {reportData.total_rows} rows
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`${API_BASE}/reports/${reportId}/export/excel`}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-color)] hover:bg-muted-light dark:hover:bg-muted-dark transition-colors flex items-center gap-1.5"
                id="export-excel-btn"
              >
                📊 Excel
              </a>
              <a
                href={`${API_BASE}/reports/${reportId}/export/pdf`}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-color)] hover:bg-muted-light dark:hover:bg-muted-dark transition-colors flex items-center gap-1.5"
                id="export-pdf-btn"
              >
                📄 PDF
              </a>
            </div>
          </div>
        </header>
      )}

      {/* Report content */}
      <main className={`max-w-7xl mx-auto ${isEmbedded ? "p-1" : "p-6"}`}>
        {/* Filters summary */}
        {meta.config.filters?.length > 0 && !isEmbedded && (
          <div className="mb-4 flex flex-wrap gap-2">
            {meta.config.filters.map((f: any, i: number) => (
              <span
                key={i}
                className="px-3 py-1 text-xs rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
              >
                {f.field} {f.operator} {String(f.value)}
              </span>
            ))}
          </div>
        )}

        {/* Visualization Grid / Layouts */}
        {/* Visualization Grid / Layouts */}
        {(meta.config?.dimensions || []).length > 1 ? (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {meta.config.dimensions.map((d: string) => {
                const ds = datasets[d];
                if (!ds || !ds.data || ds.data.length === 0) return null;
                
                const chartType = d === "month" || d === "date" || d === "week" ? "line_chart" : "bar_chart";
                const metricName = (meta.config.metrics?.[0] || "value").replace(/_/g, " ");
                return (
                  <div key={d} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-[var(--border-color)] flex flex-col justify-between">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
                      {metricName} by {d}
                    </h3>
                    <ChartView
                      type={chartType}
                      data={ds.data}
                      dimensions={[d]}
                      metrics={meta.config.metrics || []}
                      isEmbedded={true}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <h3 className="text-xs font-bold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
                Detailed Data View (Combined Dimensions)
              </h3>
              <TableView columns={reportData.columns} data={reportData.data} isEmbedded={true} />
            </div>
          </div>
        ) : (
          <>
            {/* Layout Mode Selector Bar */}
            <div className="mb-4 flex items-center justify-between bg-white dark:bg-surface-dark border border-[var(--border-color)] px-4 py-2 rounded-xl shadow-xs">
              <span className="text-xs font-semibold text-[var(--text-primary)]">Layout Mode:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setLayoutMode("single")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    layoutMode === "single"
                      ? "bg-[#c27a39] text-white shadow-xs"
                      : "border border-[var(--border-color)] hover:bg-muted-light dark:hover:bg-muted-dark text-[var(--text-primary)]"
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => setLayoutMode("split")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    layoutMode === "split"
                      ? "bg-[#c27a39] text-white shadow-xs"
                      : "border border-[var(--border-color)] hover:bg-muted-light dark:hover:bg-muted-dark text-[var(--text-primary)]"
                  }`}
                >
                  Split (Chart + Table)
                </button>
                <button
                  onClick={() => setLayoutMode("multi_chart")}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                    layoutMode === "multi_chart"
                      ? "bg-[#c27a39] text-white shadow-xs"
                      : "border border-[var(--border-color)] hover:bg-muted-light dark:hover:bg-muted-dark text-[var(--text-primary)]"
                  }`}
                >
                  Multi-Chart (Bar + Line)
                </button>
              </div>
            </div>

            {/* Visualization Grid */}
            {layoutMode === "single" ? (
              viz === "table" ? (
                <TableView columns={reportData.columns} data={reportData.data} isEmbedded={isEmbedded} />
              ) : (
                <ChartView
                  type={viz}
                  data={reportData.data}
                  dimensions={meta.config?.dimensions || []}
                  metrics={meta.config?.metrics || []}
                  isEmbedded={isEmbedded}
                />
              )
            ) : layoutMode === "split" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartView
                  type={viz === "table" ? "bar_chart" : viz}
                  data={reportData.data}
                  dimensions={meta.config?.dimensions || []}
                  metrics={meta.config?.metrics || []}
                  isEmbedded={true}
                />
                <TableView columns={reportData.columns} data={reportData.data} isEmbedded={true} />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartView
                  type="bar_chart"
                  data={reportData.data}
                  dimensions={meta.config?.dimensions || []}
                  metrics={meta.config?.metrics || []}
                  isEmbedded={true}
                />
                <ChartView
                  type="line_chart"
                  data={reportData.data}
                  dimensions={meta.config?.dimensions || []}
                  metrics={meta.config?.metrics || []}
                  isEmbedded={true}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AG Grid table view
// ---------------------------------------------------------------------------
function TableView({
  columns,
  data,
  isEmbedded,
}: {
  columns: string[];
  data: Record<string, any>[];
  isEmbedded?: boolean;
}) {
  const columnDefs = columns.map((col) => ({
    field: col,
    headerName: col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    sortable: true,
    filter: true,
    resizable: true,
  }));

  return (
    <div
      className="ag-theme-alpine dark:ag-theme-alpine-dark w-full"
      style={{ height: isEmbedded ? 440 : 600 }}
    >
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        pagination={true}
        paginationPageSize={isEmbedded ? 15 : 50}
        domLayout="normal"
        defaultColDef={{
          flex: 1,
          minWidth: 120,
          sortable: true,
          filter: true,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ECharts chart view
// ---------------------------------------------------------------------------
function ChartView({
  type,
  data,
  dimensions,
  metrics,
  isEmbedded,
}: {
  type: string;
  data: Record<string, any>[];
  dimensions: string[];
  metrics: string[];
  isEmbedded?: boolean;
}) {
  // Dynamically classify dimension and metric keys if not provided or to adapt to any schema
  let dimKey = dimensions?.[0];
  let metricKey = metrics?.[0];

  if (!dimKey || !metricKey) {
    const keys = Object.keys(data[0] || {});
    // Filter out id/uuid columns
    const candidateKeys = keys.filter(k => k.toLowerCase() !== "id" && k.toLowerCase() !== "uuid");
    
    // Find numeric column as metric
    const numericKey = candidateKeys.find(k => {
      const val = data[0]?.[k];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== "");
    });
    
    // Find non-numeric column as dimension
    const categoricalKey = candidateKeys.find(k => {
      const val = data[0]?.[k];
      return typeof val === 'string' && (isNaN(Number(val)) || val.trim() === "");
    });

    dimKey = dimKey || categoricalKey || candidateKeys[0] || "";
    metricKey = metricKey || numericKey || candidateKeys.find(k => k !== dimKey) || "";
  }

  const labels = data.map((d) => String(d[dimKey] !== undefined ? d[dimKey] : ""));
  const values = data.map((d) => Number(d[metricKey]) || 0);

  let option: any = {};

  if (type === "bar_chart") {
    option = {
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "category", data: labels, axisLabel: { rotate: 45 } },
      yAxis: { type: "value" },
      series: [{ data: values, type: "bar", itemStyle: { color: "#c27a39" } }],
    };
  } else if (type === "line_chart") {
    option = {
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: { type: "category", data: labels },
      yAxis: { type: "value" },
      series: [{ data: values, type: "line", smooth: true, itemStyle: { color: "#c27a39" } }],
    };
  } else if (type === "pie_chart") {
    option = {
      color: ["#c27a39", "#319795", "#4a5568", "#dd6b20", "#805ad5", "#e53e3e"],
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["40%", "70%"],
          data: data.map((d) => ({ name: String(d[dimKey] !== undefined ? d[dimKey] : ""), value: Number(d[metricKey]) || 0 })),
        },
      ],
    };
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl ${isEmbedded ? "p-2" : "p-6 shadow-sm"}`}>
      <ReactECharts option={option} style={{ height: isEmbedded ? 440 : 450 }} />
    </div>
  );
}
