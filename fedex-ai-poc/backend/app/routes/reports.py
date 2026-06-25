from typing import Any
from fastapi import APIRouter, HTTPException
from app.database.session import get_table
from app.database.models import TABLES

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/{report_id}")
async def get_report(report_id: str) -> dict[str, Any]:
    resp = get_table(TABLES["reports"]).get_item(Key={"report_id": report_id})
    item = resp.get("Item")
    if not item:
        raise HTTPException(status_code=404, detail="Report not found")
    return {k: v for k, v in item.items() if k != "expires_at"}
