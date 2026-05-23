"""
AI provider abstraction for generating semantic queries from natural language.

Supports:
  - MockProvider: deterministic responses for demo prompts (AI_PROVIDER=mock)
  - BedrockProvider: AWS Bedrock Llama 3.1 / Claude (AI_PROVIDER=bedrock)
"""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from typing import Any

from app.analytics.schemas import SemanticQuery
from app.config import settings


# ---------------------------------------------------------------------------
# Base provider
# ---------------------------------------------------------------------------
class AIProvider(ABC):
    @abstractmethod
    def generate_semantic_query(self, user_message: str, chat_history: list[dict]) -> dict:
        """
        Given a user message, return one of:
          {"type": "query", "semantic_query": {...}}
          {"type": "clarification", "reply": "..."}
        """
        ...


# ---------------------------------------------------------------------------
# Mock provider — deterministic demo responses
# ---------------------------------------------------------------------------
MOCK_RESPONSES: dict[str, dict] = {
    "show me total shipments by region": {
        "type": "query",
        "semantic_query": {
            "metrics": ["total_shipments"],
            "dimensions": ["region"],
            "filters": [],
            "visualization": "bar_chart",
            "sort": [{"field": "total_shipments", "order": "desc"}],
            "limit": 100,
            "title": "Total Shipments by Region",
        },
    },
    "delayed shipments by month": {
        "type": "query",
        "semantic_query": {
            "metrics": ["delayed_shipments", "total_shipments"],
            "dimensions": ["month"],
            "filters": [],
            "visualization": "line_chart",
            "sort": [{"field": "month", "order": "asc"}],
            "limit": 12,
            "title": "Delayed Shipments by Month",
        },
    },
    "sla breach rate by hub": {
        "type": "query",
        "semantic_query": {
            "metrics": ["sla_breach_percent", "total_shipments"],
            "dimensions": ["hub"],
            "filters": [],
            "visualization": "bar_chart",
            "sort": [{"field": "sla_breach_percent", "order": "desc"}],
            "limit": 20,
            "title": "SLA Breach Rate by Hub",
        },
    },
    "revenue breakdown by payment type": {
        "type": "query",
        "semantic_query": {
            "metrics": ["total_revenue"],
            "dimensions": ["payment_type"],
            "filters": [],
            "visualization": "pie_chart",
            "sort": [],
            "limit": 10,
            "title": "Revenue by Payment Type",
        },
    },
    "compare express vs standard delivery success": {
        "type": "query",
        "semantic_query": {
            "metrics": ["delivery_success_rate", "total_shipments"],
            "dimensions": ["shipment_type"],
            "filters": [],
            "visualization": "bar_chart",
            "sort": [],
            "limit": 10,
            "title": "Delivery Success: Express vs Standard",
        },
    },
}


class MockProvider(AIProvider):
    """Deterministic provider for local demos without AWS credentials."""

    def generate_semantic_query(self, user_message: str, chat_history: list[dict]) -> dict:
        normalised = user_message.strip().lower()

        # 1. Exact or fuzzy match against known complete demo prompts
        for key, response in MOCK_RESPONSES.items():
            if key == normalised or key in normalised:
                return response

        # 2. Check chat history for follow-ups and accumulate slot fillings
        last_assistant_msg = ""
        for msg in reversed(chat_history or []):
            if msg.get("role") == "assistant":
                last_assistant_msg = msg.get("content", "")
                break

        # Accumulate all user utterances in this session
        user_turns = [m.get("content", "").lower() for m in (chat_history or []) if m.get("role") == "user"]
        user_turns.append(normalised)
        combined_user_input = " ".join(user_turns)

        # Slot detection
        has_month = "month" in combined_user_input
        has_region = "region" in combined_user_input
        has_hub = "hub" in combined_user_input
        has_payment = "payment" in combined_user_input or "payment_type" in combined_user_input

        has_line = "line" in combined_user_input
        has_bar = "bar" in combined_user_input
        has_pie = "pie" in combined_user_input
        has_table = "table" in combined_user_input

        if "delayed shipments" in last_assistant_msg.lower() or "delay" in combined_user_input:
            if has_month and (has_line or has_bar or has_table):
                resp = dict(MOCK_RESPONSES["delayed shipments by month"])
                resp["semantic_query"] = dict(resp["semantic_query"])
                if has_bar:
                    resp["semantic_query"]["visualization"] = "bar_chart"
                elif has_table:
                    resp["semantic_query"]["visualization"] = "table"
                else:
                    resp["semantic_query"]["visualization"] = "line_chart"
                return resp
            elif has_month:
                return {
                    "type": "clarification",
                    "reply": "Great! And what **visualization format** do you prefer for delayed shipments by month (e.g., **line_chart** or **bar_chart**)?"
                }
            elif has_line or has_bar or has_table:
                viz_name = "bar chart" if has_bar else ("table" if has_table else "line chart")
                return {
                    "type": "clarification",
                    "reply": f"Got it, {viz_name}. And which **dimension** should we group delayed shipments by (e.g., **month**, **hub**, or **city**)?"
                }
            else:
                return {
                    "type": "clarification",
                    "reply": "I can show you **Delayed Shipments**! Which **dimension** would you like to group by (e.g. **month**, **hub**, or **city**)? And what **visualization format** do you prefer (e.g. **line_chart** or **bar_chart**)?"
                }

        if "total shipments" in last_assistant_msg.lower() or "shipment" in combined_user_input or "volume" in combined_user_input:
            if has_region and (has_bar or has_pie or has_line or has_table):
                resp = dict(MOCK_RESPONSES["show me total shipments by region"])
                resp["semantic_query"] = dict(resp["semantic_query"])
                if has_pie:
                    resp["semantic_query"]["visualization"] = "pie_chart"
                elif has_line:
                    resp["semantic_query"]["visualization"] = "line_chart"
                elif has_table:
                    resp["semantic_query"]["visualization"] = "table"
                else:
                    resp["semantic_query"]["visualization"] = "bar_chart"
                return resp
            elif has_region:
                return {
                    "type": "clarification",
                    "reply": "Great! And what **visualization format** do you prefer for total shipments by region (e.g., **bar_chart** or **pie_chart**)?"
                }
            elif has_bar or has_pie or has_line or has_table:
                viz_name = "bar chart" if has_bar else ("pie chart" if has_pie else ("line chart" if has_line else "table"))
                return {
                    "type": "clarification",
                    "reply": f"Got it, {viz_name}. And which **dimension** should we group total shipments by (e.g., **region**, **state**, or **hub**)?"
                }
            else:
                return {
                    "type": "clarification",
                    "reply": "I can show you **Total Shipments**! Which **dimension** would you like to group by (e.g. **region**, **state**, or **hub**)? And what **visualization format** do you prefer (e.g. **bar_chart** or **pie_chart**)?"
                }

        if "sla breach rate" in last_assistant_msg.lower() or "sla" in combined_user_input or "breach" in combined_user_input:
            if has_hub and (has_bar or has_table or has_line):
                resp = dict(MOCK_RESPONSES["sla breach rate by hub"])
                resp["semantic_query"] = dict(resp["semantic_query"])
                if has_table:
                    resp["semantic_query"]["visualization"] = "table"
                elif has_line:
                    resp["semantic_query"]["visualization"] = "line_chart"
                else:
                    resp["semantic_query"]["visualization"] = "bar_chart"
                return resp
            elif has_hub:
                return {
                    "type": "clarification",
                    "reply": "Great! And what **visualization format** do you prefer for SLA breach rate by hub (e.g., **bar_chart** or **table**)?"
                }
            elif has_bar or has_table or has_line:
                viz_name = "bar chart" if has_bar else ("table" if has_table else "line chart")
                return {
                    "type": "clarification",
                    "reply": f"Got it, {viz_name}. And which **dimension** should we group SLA breach rate by (e.g., **hub** or **city**)?"
                }
            else:
                return {
                    "type": "clarification",
                    "reply": "I can show you the **SLA Breach Rate**! Which **dimension** would you like to group by (e.g. **hub** or **city**)? And what **visualization format** do you prefer (e.g. **bar_chart** or **table**)?"
                }

        if "revenue breakdown" in last_assistant_msg.lower() or "revenue" in combined_user_input or "payment" in combined_user_input or "cod" in combined_user_input:
            if has_payment and (has_pie or has_bar or has_table or has_line):
                resp = dict(MOCK_RESPONSES["revenue breakdown by payment type"])
                resp["semantic_query"] = dict(resp["semantic_query"])
                if has_bar:
                    resp["semantic_query"]["visualization"] = "bar_chart"
                elif has_line:
                    resp["semantic_query"]["visualization"] = "line_chart"
                elif has_table:
                    resp["semantic_query"]["visualization"] = "table"
                else:
                    resp["semantic_query"]["visualization"] = "pie_chart"
                return resp
            elif has_payment:
                return {
                    "type": "clarification",
                    "reply": "Great! And what **visualization format** do you prefer for revenue breakdown by payment type (e.g., **pie_chart** or **bar_chart**)?"
                }
            elif has_pie or has_bar or has_table or has_line:
                viz_name = "pie chart" if has_pie else ("bar chart" if has_bar else ("table" if has_table else "line chart"))
                return {
                    "type": "clarification",
                    "reply": f"Got it, {viz_name}. And which **dimension** should we group revenue breakdown by (e.g., **payment_type** or **city**)?"
                }
            else:
                return {
                    "type": "clarification",
                    "reply": "I can show you the **Revenue Breakdown**! Which **dimension** would you like to group by (e.g. **payment_type** or **city**)? And what **visualization format** do you prefer (e.g. **pie_chart** or **bar_chart**)?"
                }

        # 4. Unknown greeting / general prompt
        return {
            "type": "clarification",
            "reply": (
                "I can help with logistics analytics! Try asking about:\n"
                "• Total shipments by region\n"
                "• Delayed shipments by month\n"
                "• SLA breach rate by hub\n"
                "• Revenue breakdown by payment type\n"
                "• Express vs standard delivery success rates"
            ),
        }


# ---------------------------------------------------------------------------
# Bedrock provider — AWS Bedrock (Llama 3.1 / Claude)
# ---------------------------------------------------------------------------
BEDROCK_SYSTEM_PROMPT = """You are a logistics analytics assistant. Given a user's natural language question about shipment data, produce a JSON object with this exact structure:

{
  "type": "query" or "clarification",
  "semantic_query": {  // only when type is "query"
    "metrics": ["<metric_name>", ...],
    "dimensions": ["<dimension_name>", ...],
    "filters": [{"field": "<field>", "operator": "<op>", "value": "<val>"}],
    "visualization": "<viz_type>",
    "sort": [{"field": "<field>", "order": "asc|desc"}],
    "limit": <number between 1 and 10000, default is 100>,
    "title": "<report title>"
  },
  "reply": "<clarification text>"  // only when type is "clarification"
}

Available metrics: total_shipments, delayed_shipments, sla_breach_percent, cod_revenue, total_revenue, avg_delivery_time, delivery_success_rate
Available dimensions: city, state, region, hub, shipment_type, payment_type, date, week, month
Available visualizations: table, bar_chart, line_chart, pie_chart
Filter operators: eq, neq, gt, gte, lt, lte, in, between
Filterable fields: city, state, region, hub_name, shipment_type, payment_type, status, weight, created_at

CRITICAL REQUIREMENTS FOR DIALOGUE:
1. If the user asks for a metric (e.g. delayed shipments, total shipments, revenue) but does not specify a grouping dimension (like month, region, hub, city) OR does not specify a preferred visualization format (like bar chart, line chart, table, pie chart), you MUST return type "clarification".
2. In the clarification reply, ask the user to specify the missing grouping dimension and visualization preference. For example, if they ask "show me delayed shipments", ask: "Which dimension would you like to group delayed shipments by (e.g., month, hub, or city)? and what visualization format do you prefer (e.g., line_chart or bar_chart)?"
3. If they specify the dimension but not the visualization (or vice versa) in a follow-up message, ask them to clarify the remaining missing parameter.
4. Only return type "query" once both the dimension and visualization are fully resolved.

Always return ONLY valid JSON. No markdown, no explanation."""


class BedrockProvider(AIProvider):
    """AWS Bedrock provider for Llama 3.1 / Claude models."""

    def __init__(self):
        import boto3

        session_kwargs: dict[str, Any] = {"region_name": settings.aws_region}
        if settings.aws_profile:
            session_kwargs["profile_name"] = settings.aws_profile

        session = boto3.Session(**session_kwargs)
        self.client = session.client("bedrock-runtime")
        self.model_id = settings.bedrock_model_id

    def generate_semantic_query(self, user_message: str, chat_history: list[dict]) -> dict:
        # Build prompt with chat history
        messages = [{"role": "system", "content": BEDROCK_SYSTEM_PROMPT}]
        for msg in (chat_history or [])[-6:]:  # last 6 messages for context
            messages.append(msg)
        messages.append({"role": "user", "content": user_message})

        # Format for Llama 3.1 prompt template
        prompt = self._format_prompt(messages)

        body = json.dumps({
            "prompt": prompt,
            "max_gen_len": 1024,
            "temperature": 0.1,
            "top_p": 0.9,
        })

        response = self.client.invoke_model(
            modelId=self.model_id,
            body=body,
            contentType="application/json",
            accept="application/json",
        )

        response_body = json.loads(response["body"].read())
        raw_text = response_body.get("generation", "")

        return self._parse_response(raw_text)

    def _format_prompt(self, messages: list[dict]) -> str:
        """Format messages into Llama 3.1 chat template."""
        parts = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                parts.append(f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{content}<|eot_id|>")
            elif role == "user":
                parts.append(f"<|start_header_id|>user<|end_header_id|>\n\n{content}<|eot_id|>")
            elif role == "assistant":
                parts.append(f"<|start_header_id|>assistant<|end_header_id|>\n\n{content}<|eot_id|>")
        parts.append("<|start_header_id|>assistant<|end_header_id|>\n\n")
        return "".join(parts)

    def _parse_response(self, raw: str) -> dict:
        """Extract and validate JSON from the LLM response."""
        # Try to find JSON in the response
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not json_match:
            return {
                "type": "clarification",
                "reply": "I had trouble understanding that. Could you rephrase your analytics question?",
            }

        try:
            parsed = json.loads(json_match.group())
        except json.JSONDecodeError:
            return {
                "type": "clarification",
                "reply": "I had trouble processing that. Could you try rephrasing?",
            }

        # Validate — reject any raw SQL
        if "semantic_query" in parsed:
            sq = parsed["semantic_query"]
            if sq and "limit" in sq:
                try:
                    limit_val = int(sq["limit"])
                    if limit_val < 1:
                        sq["limit"] = 100
                except (ValueError, TypeError):
                    sq["limit"] = 100
            elif sq:
                sq["limit"] = 100

            sq_raw = json.dumps(parsed["semantic_query"]).lower()
            sql_keywords = ["select ", "insert ", "update ", "delete ", "drop ", "alter ", " from ", " where "]
            if any(kw in sq_raw for kw in sql_keywords):
                return {
                    "type": "clarification",
                    "reply": "I can only generate structured analytics queries. Please describe what you'd like to analyze.",
                }

        return parsed


# ---------------------------------------------------------------------------
# Provider factory
# ---------------------------------------------------------------------------
def get_provider() -> AIProvider:
    """Return the configured AI provider instance."""
    if settings.ai_provider == "bedrock":
        if not settings.aws_region:
            raise RuntimeError(
                "AI_PROVIDER=bedrock requires AWS_REGION to be set. "
                "Set AI_PROVIDER=mock for local demos without AWS credentials."
            )
        return BedrockProvider()

    return MockProvider()
