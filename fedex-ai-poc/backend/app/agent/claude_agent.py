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

MAX_TURNS = 5
MAX_SQL_RETRIES = 2

SYSTEM_PROMPT = """You are QuantixAI, an intelligent analytics assistant.
You have access to the user's database via tools. When a user asks a question about their data:

1. Use list_tables or get_table_sample if you need to explore the schema.
2. Write a precise SQL SELECT query using run_sql.
3. If the query fails, analyse the error and retry with a corrected query (max 2 retries).
4. Present results clearly with a markdown summary and recommend a visualization type
   (bar_chart, line_chart, pie_chart, or table) based on the data shape.

Rules:
- Only SELECT queries are allowed. Never attempt INSERT, UPDATE, DELETE, DROP, or CREATE.
- Always include a LIMIT clause in your queries.
- Be concise and data-driven in your responses.
- If connecting to SQLite, avoid window functions (ROW_NUMBER, RANK, LAG, LEAD, OVER) — use subqueries or GROUP BY instead.
- For date arithmetic in SQLite use strftime() and date(), not DATEADD or DATE_TRUNC.

Database schema (relevant tables):
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

                if stop_reason == "end_turn":
                    # Final text response
                    reply = " ".join(
                        b["text"] for b in content_blocks if b.get("type") == "text"
                    ).strip()
                    return {
                        "reply": reply,
                        "sql_query": last_sql,
                        "query_result": last_result,
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
            "response_type": "text",
        }

    @staticmethod
    async def _dispatch_tool(
        name: str,
        inputs: dict,
        connection_id: str,
        engine,
    ) -> Any:
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
