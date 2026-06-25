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

export interface DemoResponse {
  reply: string;
  type: "text" | "report";
  charts?: ChartDataset[];
}

const RESPONSES: Array<{ patterns: RegExp[]; response: DemoResponse }> = [
  {
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
        "**West Coast** leads with 18,562 shipments. **South East** has the lowest on-time rate at 87.6%, worth investigating.\n\n" +
        "Want to drill down? Try: (e.g., delayed shipments by month, SLA breach rate by hub, revenue breakdown by payment type)",
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
    },
  },
  {
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
        "**May 2026** saw the highest delay rate at 10.8%, likely driven by weather disruptions in the Midwest corridor. June shows a significant improvement.\n\n" +
        "Try: (e.g., SLA breach rate by hub, compare express vs standard delivery, revenue breakdown by payment type)",
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
    },
  },
  {
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
        "**Phoenix AZ** has the highest breach rate (8.4%) despite being a low-volume hub — capacity or staffing issues may be the root cause. **Dallas TX** is the best performer.\n\n" +
        "Try: (e.g., show me total shipments by region, revenue breakdown by payment type, compare express vs standard delivery)",
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
    },
  },
  {
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
        "Account/Net-30 customers generate the highest revenue at **$4.8M (41.3%)**. COD and Prepaid together account for only 11% — consider incentivizing account sign-ups.\n\n" +
        "Total Q2 revenue: **$11,672,000** (+12.4% vs Q1)\n\n" +
        "Try: (e.g., delayed shipments by month, SLA breach rate by hub, compare express vs standard delivery)",
      charts: [
        {
          chartType: "pie",
          title: "Revenue by Payment Type",
          labels: ["Account/Net-30", "Credit Card", "Invoice", "Cash on Delivery", "Prepaid"],
          values: [4821340, 3104220, 2456780, 876430, 413230],
          valueLabel: "Revenue ($)",
        },
      ],
    },
  },
  {
    patterns: [/express.*standard|standard.*express|delivery success/i, /compare.*delivery/i],
    response: {
      type: "report",
      reply:
        "**Express vs Standard delivery — performance comparison:**\n\n" +
        "| Type | Shipments | On-Time Rate | Avg Transit | Avg Revenue |\n" +
        "| --- | --- | --- | --- | --- |\n" +
        "| Express | 28,441 | 96.2% | 1.2 days | $24.80 |\n" +
        "| Standard | 38,509 | 88.7% | 3.8 days | $12.40 |\n\n" +
        "**Express** outperforms on reliability (96.2% on-time) and generates 2× revenue per shipment. **Standard** has a notable 11.3% late rate — the primary driver of SLA complaints.\n\n" +
        "Upgrading just 5% of standard shipments to express could reduce SLA breaches by ~$180K annually.\n\n" +
        "Try: (e.g., revenue breakdown by payment type, SLA breach rate by hub, show total shipments by region)",
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
    },
  },
];

const FALLBACK: DemoResponse = {
  type: "text",
  reply:
    "I'm running in **demo mode** with sample logistics data. I can answer questions about:\n\n" +
    "- 📦 **Shipments** — by region, month, hub, or carrier\n" +
    "- ⏱️ **Delays & SLA breaches** — breach rates, root causes\n" +
    "- 💵 **Revenue** — by payment type, customer segment\n" +
    "- 🚚 **Express vs Standard** — delivery performance\n\n" +
    "Try one of the suggested questions above, or ask something like:\n" +
    "(e.g., show me total shipments by region, delayed shipments by month, SLA breach rate by hub, revenue breakdown by payment type, compare express vs standard delivery success)",
};

export function getDemoResponse(message: string): DemoResponse {
  for (const { patterns, response } of RESPONSES) {
    if (patterns.some((p) => p.test(message))) return response;
  }
  return FALLBACK;
}
