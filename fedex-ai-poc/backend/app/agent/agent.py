"""
LangGraph agent workflow for the analytics chatbot.

Nodes:
  1. extract_intent   — call AI provider to get semantic query or clarification
  2. validate_query   — validate the semantic query JSON against Pydantic schemas
  3. execute_query    — run the validated query through the Peewee query builder
  4. create_report    — save report metadata to SQLite and return report URL
"""

from __future__ import annotations

import json
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.agent.providers import get_provider
from app.analytics.query_builder import build_query
from app.analytics.schemas import SemanticQuery
from app.database.models import SavedReport, db


# ---------------------------------------------------------------------------
# State schema
# ---------------------------------------------------------------------------
class AgentState(TypedDict, total=False):
    user_message: str
    chat_history: list[dict]
    ai_response: dict
    semantic_query: SemanticQuery | None
    query_result: list[dict] | None
    report_id: int | None
    reply: str
    response_type: str  # text | report | clarification


# ---------------------------------------------------------------------------
# Node implementations
# ---------------------------------------------------------------------------
def extract_intent(state: AgentState) -> AgentState:
    """Call the AI provider to interpret the user's message."""
    provider = get_provider()
    response = provider.generate_semantic_query(
        state["user_message"],
        state.get("chat_history", []),
    )
    state["ai_response"] = response
    return state


def validate_query(state: AgentState) -> AgentState:
    """Validate the AI-generated semantic query against Pydantic schemas."""
    ai_resp = state.get("ai_response", {})

    if ai_resp.get("type") == "clarification":
        state["reply"] = ai_resp.get("reply", "Could you clarify your question?")
        state["response_type"] = "clarification"
        state["semantic_query"] = None
        return state

    sq_data = ai_resp.get("semantic_query")
    if not sq_data:
        state["reply"] = "I couldn't generate a query from that. Please try rephrasing."
        state["response_type"] = "clarification"
        state["semantic_query"] = None
        return state

    try:
        sq = SemanticQuery(**sq_data)
        state["semantic_query"] = sq
    except Exception as exc:
        from pydantic import ValidationError
        if isinstance(exc, ValidationError):
            error_msgs = []
            for err in exc.errors():
                loc_path = [str(l) for l in err["loc"]]
                inp = err.get("input")
                
                if "dimensions" in loc_path:
                    val_str = str(inp).capitalize() if inp else "Input"
                    error_msgs.append(
                        f"{val_str} is not a valid dimension. Please choose from city, state, region, hub, shipment_type, payment_type, date, week, month, or year. "
                        "You can ask again, for example: 'show me delayed shipments grouped by month in bar chart'."
                    )
                elif "metrics" in loc_path:
                    val_str = str(inp).capitalize() if inp else "Input"
                    error_msgs.append(
                        f"{val_str} is not a valid metric. Please choose from total_shipments, delayed_shipments, sla_breach_percent, cod_revenue, total_revenue, avg_delivery_time, or delivery_success_rate."
                    )
                elif "visualization" in loc_path:
                    val_str = str(inp).capitalize() if inp else "Input"
                    error_msgs.append(
                        f"{val_str} is not a valid visualization. Please choose from table, bar_chart, line_chart, or pie_chart."
                    )
                else:
                    error_msgs.append(f"Invalid value for '{' -> '.join(loc_path)}': {err['msg']}")
            
            state["reply"] = "\n".join(error_msgs)
        else:
            state["reply"] = "Query validation failed. Please try a different question."
            
        state["response_type"] = "clarification"
        state["semantic_query"] = None

    return state


def execute_query(state: AgentState) -> AgentState:
    """Execute the validated semantic query via Peewee query builder."""
    sq = state.get("semantic_query")
    if sq is None:
        return state

    try:
        result = build_query(sq)
        state["query_result"] = result
    except Exception as exc:
        state["reply"] = f"Query execution error: {exc}"
        state["response_type"] = "text"
        state["semantic_query"] = None
        state["query_result"] = None

    return state


def create_report(state: AgentState) -> AgentState:
    """Save report metadata and compose the final response."""
    sq = state.get("semantic_query")
    result = state.get("query_result")

    if sq is None or result is None:
        # Already handled as clarification/error
        return state

    # Save to database
    with db.atomic():
        report = SavedReport.create(
            title=sq.title,
            config_json=json.dumps(sq.model_dump(), default=str),
            layout_json=json.dumps({"visualization": sq.visualization.value}),
        )

    state["report_id"] = report.id
    state["reply"] = (
        f"**{sq.title}**\n\n"
        f"Generated report with {len(result)} rows.\n"
        f"[View Report](/ai/reports/{report.id})"
    )
    state["response_type"] = "report"
    return state


# ---------------------------------------------------------------------------
# Routing logic
# ---------------------------------------------------------------------------
def should_execute(state: AgentState) -> str:
    """Route: if we have a valid semantic query, execute it; otherwise end."""
    if state.get("semantic_query") is not None:
        return "execute_query"
    return END


# ---------------------------------------------------------------------------
# Graph construction
# ---------------------------------------------------------------------------
def build_agent_graph() -> StateGraph:
    """Build and compile the LangGraph agent workflow."""
    graph = StateGraph(AgentState)

    graph.add_node("extract_intent", extract_intent)
    graph.add_node("validate_query", validate_query)
    graph.add_node("execute_query", execute_query)
    graph.add_node("create_report", create_report)

    graph.set_entry_point("extract_intent")
    graph.add_edge("extract_intent", "validate_query")
    graph.add_conditional_edges("validate_query", should_execute, {
        "execute_query": "execute_query",
        END: END,
    })
    graph.add_edge("execute_query", "create_report")
    graph.add_edge("create_report", END)

    return graph.compile()


# Singleton compiled graph
agent_graph = build_agent_graph()
