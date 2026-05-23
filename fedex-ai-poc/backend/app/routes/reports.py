"""
Report API routes.

All endpoints are globally accessible — no authentication or ownership checks.

Endpoints:
  POST /api/reports/generate          — save report metadata, return report URL
  GET  /api/reports/{id}              — return report metadata
  GET  /api/reports/{id}/data         — rerun the saved semantic query (live data)
  GET  /api/users/reports             — list all saved reports (for PHP menu)
"""

import json
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.analytics.query_builder import build_query
from app.analytics.schemas import ReportGenerateRequest, SemanticQuery
from app.database.models import SavedReport, db

router = APIRouter(prefix="/api", tags=["reports"])


# ---------------------------------------------------------------------------
# POST /api/reports/generate
# ---------------------------------------------------------------------------
@router.post("/reports/generate")
async def generate_report(req: ReportGenerateRequest):
    """Save report metadata to the database and return a report URL."""
    with db.atomic():
        report = SavedReport.create(
            title=req.title,
            config_json=json.dumps(req.semantic_query.model_dump(), default=str),
            layout_json=json.dumps({"visualization": req.semantic_query.visualization.value}),
        )

    return {
        "id": report.id,
        "title": report.title,
        "url": f"/ai/reports/{report.id}",
        "created_at": report.created_at.isoformat() if isinstance(report.created_at, datetime) else str(report.created_at),
    }


# ---------------------------------------------------------------------------
# GET /api/reports/{id}
# ---------------------------------------------------------------------------
@router.get("/reports/{report_id}")
async def get_report(report_id: int):
    """Return report metadata from the database. No auth checks."""
    report = SavedReport.get_or_none(SavedReport.id == report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "id": report.id,
        "title": report.title,
        "config": json.loads(report.config_json),
        "layout": json.loads(report.layout_json),
        "created_at": report.created_at.isoformat() if isinstance(report.created_at, datetime) else str(report.created_at),
    }


# ---------------------------------------------------------------------------
# GET /api/reports/{id}/data
# ---------------------------------------------------------------------------
@router.get("/reports/{report_id}/data")
async def get_report_data(report_id: int):
    """
    Rerun the saved semantic query against live SQLite data.
    No result snapshots are stored — always executes a fresh query.
    """
    report = SavedReport.get_or_none(SavedReport.id == report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    config = json.loads(report.config_json)
    sq = SemanticQuery(**config)
    rows = build_query(sq)

    return {
        "id": report.id,
        "title": report.title,
        "visualization": sq.visualization.value,
        "columns": list(rows[0].keys()) if rows else [],
        "data": rows,
        "total_rows": len(rows),
    }


# ---------------------------------------------------------------------------
# GET /api/users/reports  (global list — no user filtering)
# ---------------------------------------------------------------------------
@router.get("/users/reports")
async def list_reports():
    """
    List all saved reports for the PHP navigation menu.
    Globally accessible — single user role, no ownership filtering.
    """
    reports = (
        SavedReport
        .select()
        .order_by(SavedReport.created_at.desc())
        .limit(100)
    )

    return [
        {
            "id": r.id,
            "title": r.title,
            "url": f"/ai/reports/{r.id}",
            "created_at": r.created_at.isoformat() if isinstance(r.created_at, datetime) else str(r.created_at),
        }
        for r in reports
    ]
