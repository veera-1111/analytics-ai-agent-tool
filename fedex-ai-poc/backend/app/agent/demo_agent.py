"""
Demo mode agent — answers any analytics question using Claude on Bedrock
with a pre-seeded in-memory logistics dataset (no real database needed).
"""
import json
import logging
from typing import Any

import boto3

from app.config import settings

logger = logging.getLogger(__name__)

_bedrock = boto3.client("bedrock-runtime", region_name=settings.aws_region_name)

# ---------------------------------------------------------------------------
# Mock dataset — 60 shipments across regions, months, hubs, carriers
# ---------------------------------------------------------------------------
DEMO_DATA = {
    "shipments_by_region": [
        {"region": "North", "total_shipments": 1240, "on_time": 1082, "delayed": 158},
        {"region": "South", "total_shipments": 980,  "on_time": 814,  "delayed": 166},
        {"region": "East",  "total_shipments": 1105, "on_time": 996,  "delayed": 109},
        {"region": "West",  "total_shipments": 875,  "on_time": 700,  "delayed": 175},
        {"region": "Central","total_shipments": 760, "on_time": 684,  "delayed": 76},
    ],
    "delayed_shipments_by_month": [
        {"month": "Jan", "delayed": 112}, {"month": "Feb", "delayed": 98},
        {"month": "Mar", "delayed": 134}, {"month": "Apr", "delayed": 89},
        {"month": "May", "delayed": 145}, {"month": "Jun", "delayed": 167},
        {"month": "Jul", "delayed": 178}, {"month": "Aug", "delayed": 156},
        {"month": "Sep", "delayed": 143}, {"month": "Oct", "delayed": 121},
        {"month": "Nov", "delayed": 108}, {"month": "Dec", "delayed": 133},
    ],
    "sla_breach_by_hub": [
        {"hub": "Chicago",     "total": 420, "breaches": 63,  "breach_rate_pct": 15.0},
        {"hub": "Dallas",      "total": 385, "breaches": 42,  "breach_rate_pct": 10.9},
        {"hub": "Atlanta",     "total": 310, "breaches": 71,  "breach_rate_pct": 22.9},
        {"hub": "Los Angeles", "total": 295, "breaches": 38,  "breach_rate_pct": 12.9},
        {"hub": "New York",    "total": 340, "breaches": 55,  "breach_rate_pct": 16.2},
        {"hub": "Seattle",     "total": 210, "breaches": 22,  "breach_rate_pct": 10.5},
    ],
    "revenue_by_payment_type": [
        {"payment_type": "Credit Card",   "revenue_usd": 1_240_500, "shipments": 1820},
        {"payment_type": "Invoice",        "revenue_usd": 980_200,  "shipments": 1340},
        {"payment_type": "ACH Transfer",   "revenue_usd": 650_750,  "shipments": 890},
        {"payment_type": "Prepaid",        "revenue_usd": 420_300,  "shipments": 760},
        {"payment_type": "Net-30 Account", "revenue_usd": 310_100,  "shipments": 510},
    ],
    "express_vs_standard": [
        {"service": "Express", "total": 1980, "on_time": 1841, "avg_transit_days": 1.4, "success_rate_pct": 92.9},
        {"service": "Standard","total": 2980, "on_time": 2435, "avg_transit_days": 4.2, "success_rate_pct": 81.7},
    ],
    "top_carriers": [
        {"carrier": "FedEx",  "shipments": 1450, "on_time_rate_pct": 91.2, "avg_cost_usd": 14.50},
        {"carrier": "UPS",    "shipments": 1210, "on_time_rate_pct": 88.7, "avg_cost_usd": 13.80},
        {"carrier": "USPS",   "shipments": 890,  "on_time_rate_pct": 79.4, "avg_cost_usd": 8.20},
        {"carrier": "DHL",    "shipments": 650,  "on_time_rate_pct": 86.5, "avg_cost_usd": 18.90},
        {"carrier": "OnTrac", "shipments": 420,  "on_time_rate_pct": 82.1, "avg_cost_usd": 11.30},
    ],
    "delay_root_causes": [
        {"cause": "Weather",          "count": 312, "pct": 23.1},
        {"cause": "Customs hold",     "count": 198, "pct": 14.7},
        {"cause": "Capacity overload","count": 287, "pct": 21.3},
        {"cause": "Address error",    "count": 176, "pct": 13.1},
        {"cause": "Vehicle breakdown","count": 143, "pct": 10.6},
        {"cause": "Failed pickup",    "count": 234, "pct": 17.3},
    ],
    "customer_segments": [
        {"segment": "Enterprise",  "revenue_usd": 1_850_000, "shipments": 2100, "avg_order_usd": 881},
        {"segment": "SMB",         "revenue_usd": 980_000,   "shipments": 1840, "avg_order_usd": 533},
        {"segment": "Individual",  "revenue_usd": 420_000,   "shipments": 1080, "avg_order_usd": 389},
        {"segment": "Government",  "revenue_usd": 350_850,   "shipments": 340,  "avg_order_usd": 1032},
    ],
}

SYSTEM_PROMPT = """You are QuantixAI, an intelligent analytics assistant running in demo mode.
You have access to a sample logistics dataset (shown below as JSON). Answer the user's question
using ONLY this data. Be analytical, precise, and data-driven.

Guidelines:
- Always cite specific numbers from the data.
- Use markdown tables when comparing multiple values.
- Suggest a chart type when relevant: mention one of: bar chart, line chart, pie chart, or table.
- If the user asks for a comparison or trend, highlight the key insight clearly.
- If the question is outside the dataset scope, explain what data IS available and offer to help with that instead.
- Keep answers concise but complete. Use bullet points for key takeaways.

Available dataset (sample logistics data):
{dataset}
"""


class DemoAgent:

    @staticmethod
    async def run(message: str, session_history: list[dict]) -> dict[str, Any]:
        system = SYSTEM_PROMPT.format(dataset=json.dumps(DEMO_DATA, indent=2))

        messages = [
            {"role": m["role"], "content": m["content"]}
            for m in session_history[-10:]
        ]
        messages.append({"role": "user", "content": message})

        try:
            response = _bedrock.invoke_model(
                modelId=settings.bedrock_model_id,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 2048,
                    "system": system,
                    "messages": messages,
                }),
                contentType="application/json",
                accept="application/json",
            )
            body = json.loads(response["body"].read())
            reply = " ".join(
                b["text"] for b in body.get("content", []) if b.get("type") == "text"
            ).strip()
            return {"reply": reply, "response_type": "text"}

        except Exception as exc:
            logger.error("DemoAgent Bedrock call failed: %s", exc)
            return {
                "reply": (
                    "I'm having trouble reaching the AI service right now. "
                    "Please try again in a moment."
                ),
                "response_type": "text",
            }
