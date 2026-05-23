"""
Chat API route.

POST /api/chat — send a user message through the LangGraph agent workflow.
No authentication checks. Session is tracked by optional session_id.
"""

from fastapi import APIRouter

from app.agent.agent import agent_graph
from app.analytics.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Process a user chat message through the analytics agent."""
    state = {
        "user_message": req.message,
        "chat_history": [],  # TODO: load from Redis by session_id
    }

    result = agent_graph.invoke(state)

    return ChatResponse(
        reply=result.get("reply", ""),
        type=result.get("response_type", "text"),
        report_id=result.get("report_id"),
        report_url=f"/ai/reports/{result['report_id']}" if result.get("report_id") else None,
        semantic_query=result.get("semantic_query"),
    )
