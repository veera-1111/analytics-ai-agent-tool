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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        const [metaRes, dataRes] = await Promise.all([
          fetch(`${API_BASE}/reports/${reportId}`),
          fetch(`${API_BASE}/reports/${reportId}/data`),
        ]);

        if (!metaRes.ok || !dataRes.ok) {
          setError("Failed to load report");
          return;
        }

        setMeta(await metaRes.json());
        setReportData(await dataRes.json());
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

        {/* Visualization */}
        {viz === "table" ? (
          <TableView columns={reportData.columns} data={reportData.data} isEmbedded={isEmbedded} />
        ) : (
          <ChartView
            type={viz}
            data={reportData.data}
            dimensions={meta.config.dimensions}
            metrics={meta.config.metrics}
            isEmbedded={isEmbedded}
          />
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
  const dimKey = dimensions[0] || Object.keys(data[0] || {})[0];
  const metricKey = metrics[0] || Object.keys(data[0] || {}).find((k) => k !== dimKey) || "";

  const labels = data.map((d) => d[dimKey]);
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
          data: data.map((d) => ({ name: d[dimKey], value: Number(d[metricKey]) || 0 })),
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
