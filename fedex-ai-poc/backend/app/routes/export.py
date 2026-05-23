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
    """Generate and stream a real PDF file from live report data."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    report = SavedReport.get_or_none(SavedReport.id == report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    config = json.loads(report.config_json)
    sq = SemanticQuery(**config)
    rows = build_query(sq)

    if not rows:
        raise HTTPException(status_code=404, detail="No data for this report")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1A365D"), # Deep blue
        spaceAfter=12
    )
    
    meta_style = ParagraphStyle(
        name='ReportMeta',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4A5568"), # Gray
        spaceAfter=15
    )

    cell_style = ParagraphStyle(
        name='TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
    )

    header_style = ParagraphStyle(
        name='TableHeader',
        parent=styles['Normal'],
        fontSize=8,
        leading=10,
        textColor=colors.white,
        fontName='Helvetica-Bold'
    )

    elements = []

    # Title & Metadata
    elements.append(Paragraph(f"Logistics Analytics Report: {report.title}", title_style))
    generated_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    elements.append(Paragraph(f"Generated at: {generated_time} | Rows: {len(rows)}", meta_style))
    elements.append(Spacer(1, 10))

    # Construct the data table
    headers = list(rows[0].keys())
    
    table_data = []
    
    # Header row
    table_data.append([Paragraph(h.upper().replace('_', ' '), header_style) for h in headers])
    
    # Data rows
    for row in rows:
        row_cells = []
        for h in headers:
            val = row.get(h)
            if val is None:
                val_str = ""
            elif isinstance(val, float):
                if "rate" in h or "percentage" in h:
                    val_str = f"{val * 100:.2f}%" if val <= 1.0 else f"{val:.2f}%"
                elif "revenue" in h or "payment" in h or "cost" in h:
                    val_str = f"${val:,.2f}"
                else:
                    val_str = f"{val:,.2f}"
            elif isinstance(val, int):
                if "revenue" in h or "payment" in h or "cost" in h:
                    val_str = f"${val:,}"
                else:
                    val_str = f"{val:,}"
            else:
                val_str = str(val)
            row_cells.append(Paragraph(val_str, cell_style))
        table_data.append(row_cells)

    # Calculate column widths
    available_width = doc.width
    col_width = available_width / len(headers)
    col_widths = [col_width] * len(headers)

    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#2B6CB0")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7FAFC")]),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
    ]))
    
    elements.append(t)
    doc.build(elements)

    buffer.seek(0)
    filename = f"{report.title.replace(' ', '_')}_{report_id}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
