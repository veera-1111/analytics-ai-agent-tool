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
# Chart Generation Helpers (ReportLab Graphics)
# ---------------------------------------------------------------------------
def create_bar_chart(data, x_labels, width=440):
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.lib import colors

    drawing = Drawing(width, 180)
    chart = VerticalBarChart()
    chart.x = 40
    chart.y = 20
    chart.height = 140
    chart.width = width - 60
    chart.data = [data]
    chart.categoryAxis.categoryNames = x_labels
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.labels.dy = -10
    chart.categoryAxis.labels.angle = 15
    chart.valueAxis.valueMin = 0
    chart.valueAxis.labels.fontSize = 7
    
    chart.bars[0].fillColor = colors.HexColor("#c27a39")
    chart.valueAxis.visibleGrid = 1
    chart.valueAxis.gridStrokeColor = colors.HexColor("#E2E8F0")
    chart.valueAxis.gridStrokeWidth = 0.5
    
    drawing.add(chart)
    return drawing

def create_line_chart(data, x_labels, width=440):
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.lineplots import LinePlot
    from reportlab.lib import colors

    drawing = Drawing(width, 180)
    chart = LinePlot()
    chart.x = 40
    chart.y = 20
    chart.height = 140
    chart.width = width - 60
    chart.data = [ [(i, val) for i, val in enumerate(data)] ]
    
    chart.xValueAxis.valueMin = 0
    chart.xValueAxis.valueMax = max(1, len(data) - 1)
    chart.xValueAxis.valueStep = 1
    chart.xValueAxis.labels.fontSize = 7
    
    def format_x_label(val):
        idx = int(round(val))
        if 0 <= idx < len(x_labels):
            return x_labels[idx]
        return ""
    chart.xValueAxis.labelTextFormat = format_x_label
    chart.xValueAxis.labels.dy = -10
    chart.xValueAxis.labels.angle = 15
    
    chart.yValueAxis.valueMin = 0
    chart.yValueAxis.labels.fontSize = 7
    chart.yValueAxis.visibleGrid = 1
    chart.yValueAxis.gridStrokeColor = colors.HexColor("#E2E8F0")
    chart.yValueAxis.gridStrokeWidth = 0.5
    
    chart.lines[0].strokeColor = colors.HexColor("#c27a39")
    chart.lines[0].strokeWidth = 2
    
    drawing.add(chart)
    return drawing

def create_pie_chart(data, x_labels, width=440):
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.lib import colors

    drawing = Drawing(width, 180)
    chart = Pie()
    chart.x = (width / 2) - 75
    chart.y = 15
    chart.width = 140
    chart.height = 140
    chart.data = data
    chart.labels = [f"{label}: {val}" for label, val in zip(x_labels, data)]
    chart.sideLabels = 1
    chart.slices.strokeWidth = 0.5
    chart.slices.strokeColor = colors.white
    
    palette = [
        colors.HexColor("#c27a39"),
        colors.HexColor("#319795"),
        colors.HexColor("#4A5568"),
        colors.HexColor("#DD6B20"),
        colors.HexColor("#805AD5"),
        colors.HexColor("#E53E3E"),
    ]
    for i in range(len(data)):
        chart.slices[i].fillColor = palette[i % len(palette)]
        
    drawing.add(chart)
    return drawing


def create_opendhi_logo_drawing(width=150, height=25):
    from reportlab.graphics.shapes import Drawing, Rect, Circle, String
    from reportlab.lib import colors
    drawing = Drawing(width, height)
    # Brackets
    drawing.add(Rect(2, 16, 6, 1.5, fillColor=colors.HexColor("#4ca649"), strokeColor=None))
    drawing.add(Rect(2, 10, 1.5, 6, fillColor=colors.HexColor("#4ca649"), strokeColor=None))
    
    drawing.add(Rect(14, 16, 6, 1.5, fillColor=colors.HexColor("#c27a39"), strokeColor=None))
    drawing.add(Rect(18.5, 10, 1.5, 6, fillColor=colors.HexColor("#c27a39"), strokeColor=None))
    
    drawing.add(Rect(2, 4, 6, 1.5, fillColor=colors.HexColor("#c27a39"), strokeColor=None))
    drawing.add(Rect(2, 4, 1.5, 6, fillColor=colors.HexColor("#c27a39"), strokeColor=None))
    
    drawing.add(Rect(14, 4, 6, 1.5, fillColor=colors.HexColor("#4ca649"), strokeColor=None))
    drawing.add(Rect(18.5, 4, 1.5, 6, fillColor=colors.HexColor("#4ca649"), strokeColor=None))
    
    # Dots inside
    drawing.add(Circle(5, 13, 0.8, fillColor=colors.HexColor("#4ca649"), strokeColor=None))
    drawing.add(Circle(17, 13, 0.8, fillColor=colors.HexColor("#c27a39"), strokeColor=None))
    drawing.add(Circle(5, 7, 0.8, fillColor=colors.HexColor("#c27a39"), strokeColor=None))
    drawing.add(Circle(17, 7, 0.8, fillColor=colors.HexColor("#4ca649"), strokeColor=None))
    
    # Text "OpenDhi"
    drawing.add(String(28, 6, "Open", fontName="Helvetica-Bold", fontSize=13, fillColor=colors.HexColor("#181816")))
    drawing.add(String(63, 6, "Dhi", fontName="Helvetica", fontSize=13, fillColor=colors.HexColor("#181816")))
    
    return drawing


# ---------------------------------------------------------------------------
# GET /api/reports/{id}/export/pdf
# ---------------------------------------------------------------------------
@router.get("/reports/{report_id}/export/pdf")
async def export_pdf(report_id: int):
    """Generate and stream a real PDF file from live report data, including charts."""
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
    
    title_style = ParagraphStyle(
        name='ReportTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#181816"),
        spaceAfter=12
    )
    
    meta_style = ParagraphStyle(
        name='ReportMeta',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4A5568"),
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

    # OpenDhi Logo Header
    elements.append(create_opendhi_logo_drawing())
    elements.append(Spacer(1, 10))

    # Title & Metadata
    elements.append(Paragraph(f"Logistics Analytics Report: {report.title}", title_style))
    generated_time = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    elements.append(Paragraph(f"Generated at: {generated_time} | Rows: {len(rows)}", meta_style))
    elements.append(Spacer(1, 10))

    # Try to generate chart if dimensions and metrics exist
    if sq.dimensions and len(rows) > 0 and sq.visualization != "table":
        dim_key = sq.dimensions[0].value
        metric_key = sq.metrics[0].value if sq.metrics else None
        
        if dim_key in rows[0] and metric_key in rows[0]:
            chart_rows = rows[:10]
            x_labels = [str(r.get(dim_key, "")) for r in chart_rows]
            
            y_values = []
            for r in chart_rows:
                val = r.get(metric_key, 0.0)
                try:
                    y_values.append(float(val) if val is not None else 0.0)
                except ValueError:
                    y_values.append(0.0)

            chart_drawing = None
            width_available = doc.width
            
            if sq.visualization == "bar_chart":
                chart_drawing = create_bar_chart(y_values, x_labels, width=width_available)
            elif sq.visualization == "line_chart":
                chart_drawing = create_line_chart(y_values, x_labels, width=width_available)
            elif sq.visualization == "pie_chart":
                chart_drawing = create_pie_chart(y_values, x_labels, width=width_available)
                
            if chart_drawing:
                elements.append(Paragraph(f"Visualization: {sq.visualization.replace('_', ' ').title()}", styles["Heading3"]))
                elements.append(Spacer(1, 5))
                elements.append(chart_drawing)
                elements.append(Spacer(1, 15))

    # Construct the data table
    elements.append(Paragraph("Data Table", styles["Heading3"]))
    elements.append(Spacer(1, 5))
    
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
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#c27a39")),
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
