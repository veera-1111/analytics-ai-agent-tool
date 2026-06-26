import json
import logging
from typing import Any

import boto3

from app.agent.tools import TOOLS
from app.config import settings
from app.connections.executor import ReadOnlyExecutor
from app.connections.manager import get_engine
from app.schema.indexer import SchemaIndexer

logger = logging.getLogger(__name__)

_bedrock = None


def _get_bedrock():
    global _bedrock
    if _bedrock is None:
        _bedrock = boto3.client("bedrock-runtime", region_name=settings.aws_region_name)
    return _bedrock

MAX_TURNS = 8
MAX_SQL_RETRIES = 2

SYSTEM_PROMPT = """You are QuantixAI, an intelligent analytics assistant.
You have access to the user's database via tools. For every user question, follow these steps exactly:

STEP 1 — QUERY
Use list_tables or get_table_sample if you need to explore the schema.
Write and run a precise SQL SELECT query using run_sql. Always include a LIMIT clause.
If a query fails, analyse the error and retry (max 2 retries).

STEP 2 — SUMMARISE
Write a concise markdown summary of the results (3-6 sentences). Include key numbers,
comparisons, and any notable insight from the data. This summary is always required.

STEP 3 — CHART (conditional)
Do NOT call render_chart unless the user's message explicitly contains one of these signals:
  "chart", "graph", "plot", "visualize", "visualization", "bar", "line", "pie",
  "trend", "show me as", "display as", "compare visually".
For all other questions — counts, lookups, summaries, averages, rankings expressed as text —
skip render_chart entirely. When in doubt, do not render a chart.

STEP 4 — FOLLOW-UPS (always required)
After the summary (and optional chart), ALWAYS call suggest_followups with 3-4 smart
next-step questions based on what was just found. One of the suggestions should always
offer to visualize the data as a chart (category: "chart") so the user can request it.

RULES:
- Only SELECT queries. Never INSERT, UPDATE, DELETE, DROP, or CREATE.
- Max 20 rows for charts, 50 for tables.
- Chart labels: max 12 items — aggregate the rest as "Other".
- SQLite: avoid window functions; use strftime()/date() for dates.
- Never suggest external tools like Excel or Tableau.

Database schema:
{schema_ddl}
"""


class ClaudeAgent:

    @staticmethod
    async def run(
        message: str,
        connection_id: str,
        session_history: list[dict],
    ) -> dict[str, Any]:
        # Load and select relevant schema
        schema = await SchemaIndexer.load(connection_id)
        if schema:
            relevant = SchemaIndexer.select_relevant_tables(schema, message)
            schema_ddl = SchemaIndexer.schema_to_ddl(relevant)
        else:
            schema_ddl = "(Schema not available — use list_tables to explore)"

        system = SYSTEM_PROMPT.format(schema_ddl=schema_ddl)

        # Build message history
        messages = [
            {"role": m["role"], "content": m["content"]}
            for m in session_history[-10:]
        ]
        messages.append({"role": "user", "content": message})

        engine = await get_engine(connection_id)
        sql_retries = 0
        last_sql = None
        last_result = None
        charts = []
        next_actions = []
        accumulated_text = []
        turn = 0

        try:
            while turn < MAX_TURNS:
                turn += 1
                logger.info("ClaudeAgent: calling Bedrock model=%s turn=%d", settings.bedrock_model_id, turn)
                try:
                    response = _get_bedrock().invoke_model(
                    modelId=settings.bedrock_model_id,
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 4096,
                        "system": system,
                        "messages": messages,
                        "tools": TOOLS,
                    }),
                    contentType="application/json",
                    accept="application/json",
                )
                except Exception as bedrock_exc:
                    logger.error("ClaudeAgent: Bedrock invoke failed [%s]: %s", type(bedrock_exc).__name__, bedrock_exc)
                    raise

                body = json.loads(response["body"].read())
                stop_reason = body.get("stop_reason")
                content_blocks = body.get("content", [])

                # Collect assistant response
                messages.append({"role": "assistant", "content": content_blocks})

                # Accumulate text from every turn (Claude may emit text alongside tool calls)
                turn_text = " ".join(b["text"] for b in content_blocks if b.get("type") == "text").strip()
                if turn_text:
                    accumulated_text.append(turn_text)

                if stop_reason == "end_turn":
                    reply = " ".join(accumulated_text).strip()
                    return {
                        "reply": reply,
                        "sql_query": last_sql,
                        "query_result": last_result,
                        "charts": charts,
                        "next_actions": next_actions,
                        "response_type": "report" if last_result else "text",
                    }

                if stop_reason != "tool_use":
                    break

                # Process tool calls
                tool_results = []
                for block in content_blocks:
                    if block.get("type") != "tool_use":
                        continue

                    tool_name = block["name"]
                    tool_input = block.get("input", {})
                    tool_use_id = block["id"]

                    try:
                        result_content = await ClaudeAgent._dispatch_tool(
                            tool_name, tool_input, connection_id, engine
                        )
                        if tool_name == "run_sql":
                            last_sql = tool_input.get("query")
                            last_result = result_content if isinstance(result_content, dict) else None
                            sql_retries = 0
                        elif tool_name == "render_chart":
                            charts.append(result_content)
                        elif tool_name == "suggest_followups":
                            next_actions = result_content
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": json.dumps(result_content),
                        })
                    except Exception as exc:
                        error_msg = str(exc)
                        logger.warning("Tool %s failed: %s", tool_name, error_msg)
                        if tool_name == "run_sql":
                            sql_retries += 1
                            if sql_retries > MAX_SQL_RETRIES:
                                return {
                                    "reply": "I was unable to generate a working SQL query for your request. Please rephrase or provide more details.",
                                    "sql_query": last_sql,
                                    "query_result": None,
                                    "response_type": "text",
                                }
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": f"Error: {error_msg}",
                            "is_error": True,
                        })

                messages.append({"role": "user", "content": tool_results})

        finally:
            await engine.dispose()

        return {
            "reply": "I reached the maximum number of steps without completing your request. Please try a more specific question.",
            "sql_query": last_sql,
            "query_result": last_result,
            "charts": charts,
            "next_actions": next_actions,
            "response_type": "text",
        }

    @staticmethod
    async def _dispatch_tool(
        name: str,
        inputs: dict,
        connection_id: str,
        engine,
    ) -> Any:
        if name == "render_chart":
            return {
                "title": inputs.get("title", "Chart"),
                "chartType": inputs.get("chart_type", "bar"),
                "labels": [str(l) for l in inputs.get("labels", [])],
                "values": [float(v) for v in inputs.get("values", [])],
                "valueLabel": inputs.get("value_label", ""),
                "color": inputs.get("color"),
            }

        if name == "suggest_followups":
            return inputs.get("suggestions", [])

        if name == "list_tables":
            schema = await SchemaIndexer.load(connection_id)
            if not schema:
                return {"error": "Schema not cached. Try refreshing the connection."}
            return [{"table": t["name"], "columns": [c["name"] for c in t["columns"]]} for t in schema]

        if name == "get_table_sample":
            table_name = inputs["table_name"]
            limit = min(inputs.get("limit", 5), 20)
            return await ReadOnlyExecutor.execute(engine, f"SELECT * FROM {table_name}", limit=limit)

        if name == "run_sql":
            query = inputs["query"]
            limit = min(inputs.get("limit", 1000), 10_000)
            return await ReadOnlyExecutor.execute(engine, query, limit=limit)

        raise ValueError(f"Unknown tool: {name}")
