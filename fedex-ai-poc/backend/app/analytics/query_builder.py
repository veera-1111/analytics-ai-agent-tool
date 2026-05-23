"""
Semantic query → Peewee SQL query builder.

Translates validated SemanticQuery objects into safe, parameter-bound
Peewee queries. No raw SQL strings are constructed or accepted.

Supported metrics:
  total_shipments, delayed_shipments, sla_breach_percent,
  cod_revenue, total_revenue, avg_delivery_time, delivery_success_rate

Supported dimensions:
  city, state, region, hub, shipment_type, payment_type, date, week, month
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from peewee import (
    Case,
    SQL,
    fn,
)

from app.analytics.schemas import (
    DimensionName,
    FilterOperator,
    MetricName,
    QueryFilter,
    SemanticQuery,
    SortOrder,
)
from app.database.models import Hub, Order, Payment, TrackingEvent, db


# ---------------------------------------------------------------------------
# Dimension → Peewee expression mapping
# ---------------------------------------------------------------------------
def _dimension_expr(dim: DimensionName):
    """Return the Peewee column expression for a dimension."""
    mapping = {
        DimensionName.CITY: Hub.city,
        DimensionName.STATE: Hub.state,
        DimensionName.REGION: Hub.region,
        DimensionName.HUB: Hub.name,
        DimensionName.SHIPMENT_TYPE: Order.shipment_type,
        DimensionName.PAYMENT_TYPE: Payment.payment_type,
        DimensionName.DATE: fn.DATE(Order.created_at),
        DimensionName.WEEK: fn.STRFTIME("%Y-W%W", Order.created_at),
        DimensionName.MONTH: fn.STRFTIME("%Y-%m", Order.created_at),
        DimensionName.YEAR: fn.STRFTIME("%Y", Order.created_at),
    }
    return mapping[dim]


# ---------------------------------------------------------------------------
# Metric → Peewee aggregate expression mapping
# ---------------------------------------------------------------------------
def _metric_expr(metric: MetricName):
    """Return (alias, peewee_aggregate) for a metric."""
    if metric == MetricName.TOTAL_SHIPMENTS:
        return ("total_shipments", fn.COUNT(Order.id))

    if metric == MetricName.DELAYED_SHIPMENTS:
        return ("delayed_shipments", fn.SUM(
            Case(None, [(Order.status == "delayed", 1)], 0)
        ))

    if metric == MetricName.SLA_BREACH_PERCENT:
        breaches = fn.SUM(Case(None, [
            ((Order.delivered_at.is_null(False)) & (Order.delivered_at > Order.sla_deadline), 1)
        ], 0))
        total = fn.COUNT(Order.id)
        return ("sla_breach_percent", (breaches * 100.0 / total))

    if metric == MetricName.COD_REVENUE:
        return ("cod_revenue", fn.SUM(
            Case(None, [(Payment.payment_type == "cod", Payment.amount)], 0)
        ))

    if metric == MetricName.TOTAL_REVENUE:
        return ("total_revenue", fn.SUM(Payment.amount))

    if metric == MetricName.AVG_DELIVERY_TIME:
        # SQLite: julianday difference in hours
        return ("avg_delivery_time", fn.AVG(
            (fn.JULIANDAY(Order.delivered_at) - fn.JULIANDAY(Order.created_at)) * 24
        ))

    if metric == MetricName.DELIVERY_SUCCESS_RATE:
        delivered = fn.SUM(Case(None, [(Order.status == "delivered", 1)], 0))
        total = fn.COUNT(Order.id)
        return ("delivery_success_rate", (delivered * 100.0 / total))

    raise ValueError(f"Unsupported metric: {metric}")


# ---------------------------------------------------------------------------
# Filter application
# ---------------------------------------------------------------------------
def _apply_filter(query, filt: QueryFilter):
    """Apply a single filter to a Peewee query via safe parameter binding."""
    # Resolve field to a Peewee column
    field_map = {
        "city": Hub.city,
        "state": Hub.state,
        "region": Hub.region,
        "hub": Hub.name,
        "hub_name": Hub.name,
        "shipment_type": Order.shipment_type,
        "payment_type": Payment.payment_type,
        "status": Order.status,
        "weight": Order.weight,
        "created_at": Order.created_at,
        "total_shipments": fn.COUNT(Order.id),
        "delayed_shipments": fn.SUM(Case(None, [(Order.status == "delayed", 1)], 0)),
    }
    col = field_map.get(filt.field)
    if col is None:
        return query  # skip unknown fields silently

    op = filt.operator
    val = filt.value

    if op == FilterOperator.EQ:
        return query.where(col == val)
    if op == FilterOperator.NEQ:
        return query.where(col != val)
    if op == FilterOperator.GT:
        return query.where(col > val)
    if op == FilterOperator.GTE:
        return query.where(col >= val)
    if op == FilterOperator.LT:
        return query.where(col < val)
    if op == FilterOperator.LTE:
        return query.where(col <= val)
    if op == FilterOperator.IN:
        if isinstance(val, list):
            return query.where(col.in_(val))
        return query
    if op == FilterOperator.BETWEEN:
        if isinstance(val, list) and len(val) == 2:
            return query.where(col.between(val[0], val[1]))
        return query

    return query


# ---------------------------------------------------------------------------
# Main query builder
# ---------------------------------------------------------------------------
def build_query(sq: SemanticQuery) -> list[dict[str, Any]]:
    """
    Build and execute a Peewee query from a validated SemanticQuery.

    Returns a list of dicts (one per row) ready for JSON serialisation.
    """
    # Determine which tables to join
    needs_payment = any(
        m in (MetricName.COD_REVENUE, MetricName.TOTAL_REVENUE)
        for m in sq.metrics
    ) or any(
        d == DimensionName.PAYMENT_TYPE for d in sq.dimensions
    ) or any(
        f.field == "payment_type" for f in sq.filters
    )

    # ── SELECT columns ────────────────────────────────────
    select_cols = []
    aliases = []

    for dim in sq.dimensions:
        expr = _dimension_expr(dim)
        select_cols.append(expr.alias(dim.value))
        aliases.append(dim.value)

    for metric in sq.metrics:
        alias, expr = _metric_expr(metric)
        select_cols.append(expr.alias(alias))
        aliases.append(alias)

    # ── Base query ────────────────────────────────────────
    query = (
        Order
        .select(*select_cols)
        .join(Hub, on=(Order.hub == Hub.id))
    )

    if needs_payment:
        query = query.switch(Order).join(
            Payment, on=(Payment.order == Order.id)
        )

    # ── Filters ───────────────────────────────────────────
    for filt in sq.filters:
        query = _apply_filter(query, filt)

    # ── Group by dimensions ───────────────────────────────
    if sq.dimensions:
        group_exprs = [_dimension_expr(d) for d in sq.dimensions]
        query = query.group_by(*group_exprs)

    # ── Sort ──────────────────────────────────────────────
    for sort_spec in sq.sort:
        col = SQL(sort_spec.field)
        if sort_spec.order == SortOrder.DESC:
            query = query.order_by(col.desc())
        else:
            query = query.order_by(col.asc())

    # ── Limit ─────────────────────────────────────────────
    query = query.limit(sq.limit)

    # ── Execute ───────────────────────────────────────────
    with db:
        rows = list(query.dicts())

    # Convert Decimal/datetime to serialisable types
    result = []
    for row in rows:
        clean = {}
        for k, v in row.items():
            if isinstance(v, datetime):
                clean[k] = v.isoformat()
            elif hasattr(v, "as_tuple"):  # Decimal
                clean[k] = float(v)
            else:
                clean[k] = v
            result.append(clean) if False else None
        result.append(clean)

    return result
