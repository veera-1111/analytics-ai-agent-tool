import io
import logging
from typing import Any

import openpyxl
from fastapi import APIRouter, HTTPException
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

from app.connections.executor import ReadOnlyExecutor
from app.connections.manager import get_engine
from app.database.session import get_table
from app.database.models import TABLES
from app.utils.s3 import presigned_url, upload_bytes

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reports", tags=["export"])


async def _get_report_data(report_id: str) -> tuple[dict, list[dict]]:
    resp = get_table(TABLES["reports"]).get_item(Key={"report_id": report_id})
    report = resp.get("Item")
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    engine = await get_engine(report["connection_id"])
    try:
        result = await ReadOnlyExecutor.execute(engine, report["sql_query"])
    finally:
        await engine.dispose()

    return report, result["data"]


@router.get("/{report_id}/export/excel")
async def export_excel(report_id: str) -> dict[str, Any]:
    report, data = await _get_report_data(report_id)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Report"

    if data:
        cols = list(data[0].keys())
        ws.append(cols)
        for row in data:
            ws.append([row.get(c, "") for c in cols])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    key = f"exports/{report_id}/report.xlsx"
    upload_bytes(key, buf.read(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    url = presigned_url(key)

    return {"url": url, "expires_in": 86400}


@router.get("/{report_id}/export/pdf")
async def export_pdf(report_id: str) -> dict[str, Any]:
    report, data = await _get_report_data(report_id)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = [Paragraph(report.get("title", "Report"), styles["Heading1"])]

    if data:
        cols = list(data[0].keys())
        table_data = [cols] + [[str(row.get(c, "")) for c in cols] for row in data[:500]]
        t = Table(table_data)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f3fe")]),
        ]))
        elements.append(t)

    doc.build(elements)
    buf.seek(0)

    key = f"exports/{report_id}/report.pdf"
    upload_bytes(key, buf.read(), "application/pdf")
    url = presigned_url(key)

    return {"url": url, "expires_in": 86400}
