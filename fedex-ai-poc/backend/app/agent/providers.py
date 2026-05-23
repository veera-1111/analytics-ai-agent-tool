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

        # Exact or fuzzy match against known demo prompts
        for key, response in MOCK_RESPONSES.items():
            if key in normalised or normalised in key:
                return response

        # Keyword-based fallback
        if "delay" in normalised or "late" in normalised:
            return MOCK_RESPONSES["delayed shipments by month"]
        if "sla" in normalised or "breach" in normalised:
            return MOCK_RESPONSES["sla breach rate by hub"]
        if "revenue" in normalised or "payment" in normalised or "cod" in normalised:
            return MOCK_RESPONSES["revenue breakdown by payment type"]
        if "express" in normalised or "standard" in normalised or "success" in normalised:
            return MOCK_RESPONSES["compare express vs standard delivery success"]
        if "shipment" in normalised or "volume" in normalised or "total" in normalised or "region" in normalised:
            return MOCK_RESPONSES["show me total shipments by region"]

        # Clarification for unknown queries
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
    "limit": <number>,
    "title": "<report title>"
  },
  "reply": "<clarification text>"  // only when type is "clarification"
}

Available metrics: total_shipments, delayed_shipments, sla_breach_percent, cod_revenue, total_revenue, avg_delivery_time, delivery_success_rate
Available dimensions: city, state, region, hub, shipment_type, payment_type, date, week, month
Available visualizations: table, bar_chart, line_chart, pie_chart
Filter operators: eq, neq, gt, gte, lt, lte, in, between
Filterable fields: city, state, region, hub_name, shipment_type, payment_type, status, weight, created_at

If the user's intent is unclear or missing critical information, return type "clarification" with a helpful reply.
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
