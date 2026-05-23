"""
Export routes for reports.

Endpoints:
  GET /api/reports/{id}/export/excel — download Excel file from live data
  GET /api/reports/{id}/export/pdf   — download PDF (placeholder — needs Puppeteer)

No authentication checks on exports.
"""

import io
import json
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.analytics.query_builder import build_query
from app.analytics.schemas import SemanticQuery
from app.database.models import SavedReport

router = APIRouter(prefix="/api", tags=["exports"])


# ---------------------------------------------------------------------------
# GET /api/reports/{id}/export/excel
# ---------------------------------------------------------------------------
@router.get("/reports/{report_id}/export/excel")
async def export_excel(report_id: int):
    """Generate and stream an Excel file from live report data."""
    import pandas as pd

    report = SavedReport.get_or_none(SavedReport.id == report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    config = json.loads(report.config_json)
    sq = SemanticQuery(**config)
    rows = build_query(sq)

    if not rows:
        raise HTTPException(status_code=404, detail="No data for this report")

    df = pd.DataFrame(rows)

    # Write to in-memory buffer
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Report", index=False)
    buffer.seek(0)

    filename = f"{report.title.replace(' ', '_')}_{report_id}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# GET /api/reports/{id}/export/pdf
# ---------------------------------------------------------------------------
@router.get("/reports/{report_id}/export/pdf")
async def export_pdf(report_id: int):
    """
    Generate a PDF export of the report page.

    This is a placeholder implementation that generates a simple PDF.
    Full Puppeteer-based page rendering will be added when Chromium
    is available in the container.
    """
    report = SavedReport.get_or_none(SavedReport.id == report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    # Placeholder: return a simple text-based PDF
    # TODO: Replace with Puppeteer page print when Chromium is in container
    config = json.loads(report.config_json)
    sq = SemanticQuery(**config)
    rows = build_query(sq)

    # Simple HTML → PDF via reportlab or similar
    # For now, return the data as a downloadable JSON
    content = json.dumps({
        "title": report.title,
        "generated_at": datetime.utcnow().isoformat(),
        "data": rows,
    }, indent=2, default=str)

    buffer = io.BytesIO(content.encode("utf-8"))
    filename = f"{report.title.replace(' ', '_')}_{report_id}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/json",  # will be application/pdf with Puppeteer
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
