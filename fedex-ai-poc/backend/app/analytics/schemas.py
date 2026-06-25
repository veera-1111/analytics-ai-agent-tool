"""
Pydantic schemas for the semantic analytics query system.

The LLM produces a SemanticQuery JSON object. The backend validates it
against these schemas before passing it to the Peewee query builder.
No raw SQL is ever accepted from the LLM.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums — supported values (allowlists)
# ---------------------------------------------------------------------------
class MetricName(str, Enum):
    TOTAL_SHIPMENTS = "total_shipments"
    DELAYED_SHIPMENTS = "delayed_shipments"
    SLA_BREACH_PERCENT = "sla_breach_percent"
    COD_REVENUE = "cod_revenue"
    TOTAL_REVENUE = "total_revenue"
    AVG_DELIVERY_TIME = "avg_delivery_time"
    DELIVERY_SUCCESS_RATE = "delivery_success_rate"


class DimensionName(str, Enum):
    CITY = "city"
    STATE = "state"
    REGION = "region"
    HUB = "hub"
    SHIPMENT_TYPE = "shipment_type"
    PAYMENT_TYPE = "payment_type"
    DATE = "date"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


class VisualizationType(str, Enum):
    TABLE = "table"
    BAR_CHART = "bar_chart"
    LINE_CHART = "line_chart"
    PIE_CHART = "pie_chart"


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class FilterOperator(str, Enum):
    EQ = "eq"
    NEQ = "neq"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    IN = "in"
    BETWEEN = "between"


# ---------------------------------------------------------------------------
# Sub-schemas
# ---------------------------------------------------------------------------
class QueryFilter(BaseModel):
    """A single filter condition on a dimension or metric."""
    field: str
    operator: FilterOperator
    value: str | int | float | list

    @field_validator("field")
    @classmethod
    def validate_filter_field(cls, v: str) -> str:
        allowed = {d.value for d in DimensionName} | {m.value for m in MetricName} | {
            "status", "weight", "created_at", "hub_name",
        }
        if v not in allowed:
            raise ValueError(f"Unsupported filter field: {v}")
        return v


class SortSpec(BaseModel):
    """Sort specification."""
    field: str
    order: SortOrder = SortOrder.DESC


# ---------------------------------------------------------------------------
# Main semantic query schema
# ---------------------------------------------------------------------------
class SemanticQuery(BaseModel):
    """
    Structured query produced by the LLM and validated before execution.
    The LLM never produces SQL — only this JSON structure.
    """
    metrics: list[MetricName] = Field(..., min_length=1)
    dimensions: list[DimensionName] = Field(default_factory=list)
    filters: list[QueryFilter] = Field(default_factory=list)
    visualization: VisualizationType = VisualizationType.TABLE
    sort: list[SortSpec] = Field(default_factory=list)
    limit: int = Field(default=100, ge=1, le=10_000)
    title: str = Field(default="Analytics Report")


# ---------------------------------------------------------------------------
# Chat request / response schemas
# ---------------------------------------------------------------------------
class ChatRequest(BaseModel):
    """Incoming user chat message."""
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Agent response to a chat message."""
    reply: str
    type: str = "text"  # text | report | clarification
    report_id: Optional[int] = None
    report_url: Optional[str] = None
    semantic_query: Optional[SemanticQuery] = None
    sql_query: Optional[str] = None
    query_info: Optional[dict] = None


class ReportGenerateRequest(BaseModel):
    """Request to generate and save a report."""
    semantic_query: Optional[SemanticQuery] = None
    sql_query: Optional[str] = None
    query_info: Optional[dict] = None
    title: str = "Analytics Report"
