export const DEMO_CONNECTION_ID = "demo";

export function isDemoMode(connectionId: string | null): boolean {
  return connectionId === DEMO_CONNECTION_ID;
}

export interface ChartDataset {
  chartType: "bar" | "line" | "pie";
  title: string;
  labels: string[];
  values: number[];
  valueLabel: string;
  color?: string;
}

/** Structured next-action suggestion shown below a report */
export interface NextAction {
  icon: string;
  label: string;
  message: string;
  category: "drilldown" | "chart" | "compare" | "export";
}

export interface DemoResponse {
  reply: string;
  type: "text" | "report";
  charts?: ChartDataset[];
  /** Proactive suggestions shown after this response */
  nextActions?: NextAction[];
  /** Raw rows for CSV/Excel download */
  csvRows?: string[][];
  csvHeaders?: string[];
}

// ─── Chart-type override patterns ────────────────────────────────────────────
// Detect requests like "show as pie", "bar chart", "line graph for that"

function detectChartOverride(msg: string): "bar" | "line" | "pie" | null {
  if (/pie|donut|doughnut/i.test(msg)) return "pie";
  if (/line|trend|over time|timeline/i.test(msg)) return "line";
  if (/bar|column|histogram/i.test(msg)) return "bar";
  return null;
}

function applyChartOverride(
  charts: ChartDataset[],
  override: "bar" | "line" | "pie"
): ChartDataset[] {
  return charts.map((c) => ({ ...c, chartType: override }));
}

// ─── Response definitions ─────────────────────────────────────────────────────

const BASE_RESPONSES: Array<{
  key: string;
  patterns: RegExp[];
  response: DemoResponse;
}> = [
  {
    key: "region",
    patterns: [/shipment.*region|region.*shipment/i, /total shipment/i],
    response: {
      type: "report",
      reply:
        "Here are **total shipments by region** from the sample logistics dataset:\n\n" +
        "| Region | Shipments | On-Time Rate |\n" +
        "| --- | --- | --- |\n" +
        "| North East | 14,823 | 92.4% |\n" +
        "| South West | 12,441 | 89.1% |\n" +
        "| Mid West | 10,987 | 94.7% |\n" +
        "| West Coast | 18,562 | 91.3% |\n" +
        "| South East | 9,334 | 87.6% |\n\n" +
        "**West Coast** leads with 18,562 shipments. **South East** has the lowest on-time rate at 87.6%, worth investigating.",
      csvHeaders: ["Region", "Shipments", "On-Time Rate"],
      csvRows: [
        ["North East", "14823", "92.4%"],
        ["South West", "12441", "89.1%"],
        ["Mid West", "10987", "94.7%"],
        ["West Coast", "18562", "91.3%"],
        ["South East", "9334", "87.6%"],
      ],
      charts: [
        {
          chartType: "bar",
          title: "Shipments by Region",
          labels: ["North East", "South West", "Mid West", "West Coast", "South East"],
          values: [14823, 12441, 10987, 18562, 9334],
          valueLabel: "Shipments",
          color: "#6366f1",
        },
        {
          chartType: "bar",
          title: "On-Time Rate by Region (%)",
          labels: ["North East", "South West", "Mid West", "West Coast", "South East"],
          values: [92.4, 89.1, 94.7, 91.3, 87.6],
          valueLabel: "On-Time %",
          color: "#22c55e",
        },
      ],
      nextActions: [
        { icon: "📈", label: "Show as line chart", message: "show shipments by region as line chart", category: "chart" },
        { icon: "🥧", label: "Show as pie chart", message: "show shipments by region as pie chart", category: "chart" },
        { icon: "⏱️", label: "Drill into South East delays", message: "delayed shipments by month", category: "drilldown" },
        { icon: "🏢", label: "Break down by hub", message: "SLA breach rate by hub", category: "compare" },
      ],
    },
  },
  {
    key: "delay",
    patterns: [/delayed.*month|month.*delay/i, /delay/i],
    response: {
      type: "report",
      reply:
        "Here are **delayed shipments by month** over the last 6 months:\n\n" +
        "| Month | Delayed Shipments | Delay Rate |\n" +
        "| --- | --- | --- |\n" +
        "| Jan 2026 | 1,204 | 8.2% |\n" +
        "| Feb 2026 | 987 | 6.9% |\n" +
        "| Mar 2026 | 1,456 | 9.4% |\n" +
        "| Apr 2026 | 1,102 | 7.3% |\n" +
        "| May 2026 | 1,678 | 10.8% |\n" +
        "| Jun 2026 | 832 | 5.6% |\n\n" +
        "**May 2026** saw the highest delay rate at 10.8%, likely driven by weather disruptions in the Midwest corridor. June shows a significant improvement.",
      csvHeaders: ["Month", "Delayed Shipments", "Delay Rate"],
      csvRows: [
        ["Jan 2026", "1204", "8.2%"],
        ["Feb 2026", "987", "6.9%"],
        ["Mar 2026", "1456", "9.4%"],
        ["Apr 2026", "1102", "7.3%"],
        ["May 2026", "1678", "10.8%"],
        ["Jun 2026", "832", "5.6%"],
      ],
      charts: [
        {
          chartType: "line",
          title: "Delayed Shipments by Month",
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          values: [1204, 987, 1456, 1102, 1678, 832],
          valueLabel: "Delayed Shipments",
          color: "#f59e0b",
        },
        {
          chartType: "line",
          title: "Monthly Delay Rate (%)",
          labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          values: [8.2, 6.9, 9.4, 7.3, 10.8, 5.6],
          valueLabel: "Delay Rate %",
          color: "#ef4444",
        },
      ],
      nextActions: [
        { icon: "📊", label: "Show as bar chart", message: "show delayed shipments as bar chart", category: "chart" },
        { icon: "🏢", label: "Compare by hub", message: "SLA breach rate by hub", category: "compare" },
        { icon: "🚚", label: "Express vs Standard impact", message: "compare express vs standard delivery success", category: "drilldown" },
        { icon: "💵", label: "Revenue impact of delays", message: "revenue breakdown by payment type", category: "drilldown" },
      ],
    },
  },
  {
    key: "sla",
    patterns: [/sla.*breach|breach.*hub|hub.*sla/i, /sla/i],
    response: {
      type: "report",
      reply:
        "**SLA breach rate by hub** — ranked by breach frequency:\n\n" +
        "| Hub | SLA Breach Rate | Volume Tier |\n" +
        "| --- | --- | --- |\n" +
        "| Memphis TN | 3.2% | High Volume |\n" +
        "| Louisville KY | 4.7% | High Volume |\n" +
        "| Indianapolis | 6.1% | Mid Volume |\n" +
        "| Dallas TX | 2.8% | High Volume |\n" +
        "| Phoenix AZ | 8.4% | Low Volume |\n" +
        "| Newark NJ | 5.9% | High Volume |\n\n" +
        "**Phoenix AZ** has the highest breach rate (8.4%) despite being a low-volume hub. **Dallas TX** is the best performer.",
      csvHeaders: ["Hub", "SLA Breach Rate", "Volume Tier"],
      csvRows: [
        ["Memphis TN", "3.2%", "High Volume"],
        ["Louisville KY", "4.7%", "High Volume"],
        ["Indianapolis", "6.1%", "Mid Volume"],
        ["Dallas TX", "2.8%", "High Volume"],
        ["Phoenix AZ", "8.4%", "Low Volume"],
        ["Newark NJ", "5.9%", "High Volume"],
      ],
      charts: [
        {
          chartType: "bar",
          title: "SLA Breach Rate by Hub (%)",
          labels: ["Dallas TX", "Memphis TN", "Louisville KY", "Newark NJ", "Indianapolis", "Phoenix AZ"],
          values: [2.8, 3.2, 4.7, 5.9, 6.1, 8.4],
          valueLabel: "Breach Rate %",
          color: "#ef4444",
        },
      ],
      nextActions: [
        { icon: "🥧", label: "Show as pie chart", message: "show SLA breach rate as pie chart", category: "chart" },
        { icon: "📍", label: "Compare by region", message: "show me total shipments by region", category: "compare" },
        { icon: "⏱️", label: "Trend over months", message: "delayed shipments by month", category: "drilldown" },
        { icon: "🚚", label: "Express vs Standard", message: "compare express vs standard delivery success", category: "compare" },
      ],
    },
  },
  {
    key: "revenue",
    patterns: [/revenue.*payment|payment.*revenue|payment type/i],
    response: {
      type: "report",
      reply:
        "**Revenue breakdown by payment type** — last quarter:\n\n" +
        "| Payment Type | Revenue | Share |\n" +
        "| --- | --- | --- |\n" +
        "| Account / Net-30 | $4,821,340 | 41.3% |\n" +
        "| Credit Card | $3,104,220 | 26.6% |\n" +
        "| Invoice | $2,456,780 | 21.0% |\n" +
        "| Cash on Delivery | $876,430 | 7.5% |\n" +
        "| Prepaid | $413,230 | 3.5% |\n\n" +
        "Account/Net-30 customers generate the highest revenue at **$4.8M (41.3%)**. Total Q2 revenue: **$11,672,000** (+12.4% vs Q1)",
      csvHeaders: ["Payment Type", "Revenue", "Share"],
      csvRows: [
        ["Account / Net-30", "$4,821,340", "41.3%"],
        ["Credit Card", "$3,104,220", "26.6%"],
        ["Invoice", "$2,456,780", "21.0%"],
        ["Cash on Delivery", "$876,430", "7.5%"],
        ["Prepaid", "$413,230", "3.5%"],
      ],
      charts: [
        {
          chartType: "pie",
          title: "Revenue by Payment Type",
          labels: ["Account/Net-30", "Credit Card", "Invoice", "Cash on Delivery", "Prepaid"],
          values: [4821340, 3104220, 2456780, 876430, 413230],
          valueLabel: "Revenue ($)",
        },
      ],
      nextActions: [
        { icon: "📊", label: "Show as bar chart", message: "show revenue by payment type as bar chart", category: "chart" },
        { icon: "📈", label: "Revenue trend by month", message: "delayed shipments by month", category: "drilldown" },
        { icon: "🏢", label: "Revenue by hub", message: "SLA breach rate by hub", category: "compare" },
        { icon: "🚚", label: "Compare delivery types", message: "compare express vs standard delivery success", category: "compare" },
      ],
    },
  },
  {
    key: "express",
    patterns: [/express.*standard|standard.*express|delivery success/i, /compare.*delivery/i],
    response: {
      type: "report",
      reply:
        "**Express vs Standard delivery — performance comparison:**\n\n" +
        "| Type | Shipments | On-Time Rate | Avg Transit | Avg Revenue |\n" +
        "| --- | --- | --- | --- | --- |\n" +
        "| Express | 28,441 | 96.2% | 1.2 days | $24.80 |\n" +
        "| Standard | 38,509 | 88.7% | 3.8 days | $12.40 |\n\n" +
        "**Express** outperforms on reliability (96.2% on-time) and generates 2× revenue per shipment. Upgrading 5% of standard shipments to express could save ~$180K in SLA penalties annually.",
      csvHeaders: ["Type", "Shipments", "On-Time Rate", "Avg Transit", "Avg Revenue"],
      csvRows: [
        ["Express", "28441", "96.2%", "1.2 days", "$24.80"],
        ["Standard", "38509", "88.7%", "3.8 days", "$12.40"],
      ],
      charts: [
        {
          chartType: "bar",
          title: "Shipments by Delivery Type",
          labels: ["Express", "Standard"],
          values: [28441, 38509],
          valueLabel: "Shipments",
          color: "#6366f1",
        },
        {
          chartType: "bar",
          title: "On-Time Rate by Delivery Type (%)",
          labels: ["Express", "Standard"],
          values: [96.2, 88.7],
          valueLabel: "On-Time %",
          color: "#22c55e",
        },
      ],
      nextActions: [
        { icon: "🥧", label: "Revenue share as pie", message: "show revenue by payment type as pie chart", category: "chart" },
        { icon: "📍", label: "On-time by region", message: "show me total shipments by region", category: "compare" },
        { icon: "🏢", label: "SLA by hub", message: "SLA breach rate by hub", category: "drilldown" },
        { icon: "📈", label: "Delay trend", message: "delayed shipments by month", category: "drilldown" },
      ],
    },
  },
];

// ─── Chart-type override responses ───────────────────────────────────────────
// "show X as pie/bar/line" — re-use same data with forced chart type

const CHART_OVERRIDE_PATTERNS: Array<{ patterns: RegExp[]; baseKey: string }> = [
  { patterns: [/region.*pie|pie.*region|shipment.*pie/i], baseKey: "region" },
  { patterns: [/region.*line|line.*region|shipment.*line/i], baseKey: "region" },
  { patterns: [/region.*bar|bar.*region/i], baseKey: "region" },
  { patterns: [/delay.*bar|bar.*delay/i], baseKey: "delay" },
  { patterns: [/delay.*pie|pie.*delay/i], baseKey: "delay" },
  { patterns: [/sla.*pie|pie.*sla|hub.*pie/i], baseKey: "sla" },
  { patterns: [/revenue.*bar|bar.*revenue|payment.*bar/i], baseKey: "revenue" },
  { patterns: [/revenue.*line|line.*revenue/i], baseKey: "revenue" },
];

const FALLBACK: DemoResponse = {
  type: "text",
  reply:
    "I'm running in **demo mode** with sample logistics data. I can answer questions about:\n\n" +
    "- 📦 **Shipments** — by region, month, hub, or carrier\n" +
    "- ⏱️ **Delays & SLA breaches** — breach rates, root causes\n" +
    "- 💵 **Revenue** — by payment type, customer segment\n" +
    "- 🚚 **Express vs Standard** — delivery performance\n\n" +
    "You can also ask me to change the chart type — e.g. *\"show as pie chart\"*, *\"bar chart for delays\"*.\n\n" +
    "Try one of the suggestions below or type your own question.",
  nextActions: [
    { icon: "📦", label: "Shipments by region", message: "Show me total shipments by region", category: "drilldown" },
    { icon: "⏱️", label: "Delayed shipments trend", message: "Delayed shipments by month", category: "drilldown" },
    { icon: "🏢", label: "SLA breach by hub", message: "SLA breach rate by hub", category: "drilldown" },
    { icon: "💵", label: "Revenue by payment type", message: "Revenue breakdown by payment type", category: "drilldown" },
  ],
};

export function getDemoResponse(message: string): DemoResponse {
  // 1. Check chart-type override first (e.g. "show as pie")
  const override = detectChartOverride(message);
  if (override) {
    for (const { patterns, baseKey } of CHART_OVERRIDE_PATTERNS) {
      if (patterns.some((p) => p.test(message))) {
        const base = BASE_RESPONSES.find((r) => r.key === baseKey);
        if (base?.response.charts) {
          return {
            ...base.response,
            charts: applyChartOverride(base.response.charts, override),
            reply:
              base.response.reply +
              `\n\n*Chart type changed to **${override}** as requested.*`,
          };
        }
      }
    }
    // Generic override — find any recent response by chart keyword alone
    if (override) {
      return {
        type: "text",
        reply: `Sure! To change the chart type, first ask about a specific dataset (e.g. *"shipments by region"*) and I'll render it as a **${override} chart**. Or click the chart type buttons on any chart below.`,
        nextActions: FALLBACK.nextActions,
      };
    }
  }

  // 2. Match normal topic patterns
  for (const { response } of BASE_RESPONSES) {
    if (response.type === "report") {
      const entry = BASE_RESPONSES.find((r) => r.response === response);
      if (entry?.patterns.some((p) => p.test(message))) return response;
    }
  }
  for (const entry of BASE_RESPONSES) {
    if (entry.patterns.some((p) => p.test(message))) return entry.response;
  }

  return FALLBACK;
}
