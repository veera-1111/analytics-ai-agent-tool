"""
Chat API route.

POST /api/chat — send a user message through the LangGraph agent workflow.
No authentication checks. Session is tracked by optional session_id.
"""

import json
import redis
from fastapi import APIRouter

from app.agent.agent import agent_graph
from app.analytics.schemas import ChatRequest, ChatResponse
from app.config import settings

router = APIRouter(prefix="/api", tags=["chat"])

# Connect to Redis
try:
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
except Exception:
    redis_client = None


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Process a user chat message through the analytics agent."""
    session_key = f"chat_history:{req.session_id}" if req.session_id else None
    history = []

    # Load history from Redis
    if redis_client and session_key:
        try:
            history_data = redis_client.get(session_key)
            if history_data:
                history = json.loads(history_data)
        except Exception:
            pass

    # Invoke agent
    state = {
        "user_message": req.message,
        "chat_history": history,
    }

    result = agent_graph.invoke(state)

    # Save updated history back to Redis
    if redis_client and session_key:
        try:
            # We save history in Bedrock-compatible structure:
            # list of {"role": "user"|"assistant", "content": "..."}
            history.append({"role": "user", "content": req.message})
            history.append({"role": "assistant", "content": result.get("reply", "")})
            
            # Save up to last 20 messages, expire in 24 hours
            redis_client.setex(session_key, 86400, json.dumps(history[-20:]))
        except Exception:
            pass

    return ChatResponse(
        reply=result.get("reply", ""),
        type=result.get("response_type", "text"),
        report_id=result.get("report_id"),
        report_url=f"/ai/reports/{result['report_id']}" if result.get("report_id") else None,
        semantic_query=result.get("semantic_query"),
    )
