from fastapi import APIRouter
from pydantic import BaseModel
from app.session.store import DynamoSessionStore

router = APIRouter(prefix="/api", tags=["history"])

class HistoryResponse(BaseModel):
    sessions: list[dict]

@router.get("/history/{user_email}", response_model=HistoryResponse)
async def get_history(user_email: str):
    sessions = await DynamoSessionStore.get_user_sessions(user_email)
    return HistoryResponse(sessions=sessions)

@router.get("/history/{user_email}/session/{session_id}")
async def get_session_messages(user_email: str, session_id: str):
    messages = await DynamoSessionStore.get_history(session_id, limit=100)
    return {"session_id": session_id, "messages": messages}
