import uuid
import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agent.claude_agent import ClaudeAgent
from app.agent.demo_agent import DemoAgent
from app.database.session import get_table
from app.database.models import TABLES, report_item, conversation_log_item
from app.session.store import DynamoSessionStore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    connection_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    type: str
    report_id: str | None = None
    report_url: str | None = None
    sql_query: str | None = None
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> Any:
    if not req.connection_id:
        raise HTTPException(
            status_code=400,
            detail={"error": "No database connected. Please connect a database first.", "action": "connect_db"},
        )

    session_id = req.session_id or str(uuid.uuid4())
    history = await DynamoSessionStore.get_history(session_id)

    # Demo mode — answer via AI with in-memory dataset, no real DB required
    if req.connection_id == "demo":
        result = await DemoAgent.run(req.message, history)
        await DynamoSessionStore.append(session_id, "user", req.message)
        await DynamoSessionStore.append(session_id, "assistant", result["reply"])
        return ChatResponse(
            reply=result["reply"],
            type=result.get("response_type", "text"),
            report_id=None,
            report_url=None,
            sql_query=None,
            session_id=session_id,
        )

    result = await ClaudeAgent.run(req.message, req.connection_id, history)

    await DynamoSessionStore.append(session_id, "user", req.message)
    await DynamoSessionStore.append(session_id, "assistant", result["reply"])

    expires_at = int(time.time()) + 86400
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()

    logs_table = get_table(TABLES["conversation_logs"])
    logs_table.put_item(Item=conversation_log_item(session_id, now + "_user", "user", req.message, req.connection_id, expires_at))
    logs_table.put_item(Item=conversation_log_item(session_id, now + "_agent", "agent", result["reply"], req.connection_id, expires_at))

    report_id = None
    report_url = None

    if result.get("response_type") == "report" and result.get("sql_query"):
        report_id = str(uuid.uuid4())
        get_table(TABLES["reports"]).put_item(Item=report_item(
            report_id=report_id,
            connection_id=req.connection_id,
            title=req.message[:200],
            sql_query=result["sql_query"],
            created_at=now,
            expires_at=int(time.time()) + 86400 * 30,
        ))
        report_url = f"/ai/reports/{report_id}"

    return ChatResponse(
        reply=result["reply"],
        type=result.get("response_type", "text"),
        report_id=report_id,
        report_url=report_url,
        sql_query=result.get("sql_query"),
        session_id=session_id,
    )
