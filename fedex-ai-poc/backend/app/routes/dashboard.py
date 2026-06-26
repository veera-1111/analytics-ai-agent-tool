import time
import uuid
import logging
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_dynamo = boto3.resource("dynamodb", region_name=settings.aws_region_name)
_TTL_SECONDS = 86_400 * 90  # 90 days

TABLE = "QuantixAI-Dashboards"
SHARE_TABLE = "QuantixAI-DashboardShares"


def _table():
    return _dynamo.Table(TABLE)


def _share_table():
    return _dynamo.Table(SHARE_TABLE)


class WidgetLayout(BaseModel):
    x: int = 0
    y: int = 0
    w: int = 6
    h: int = 4


class AddWidgetRequest(BaseModel):
    chart_title: str
    chart_type: str
    labels: list[str]
    values: list[float]
    value_label: str
    color: str = "#6366f1"
    description: str = ""
    layout: WidgetLayout = WidgetLayout()


class UpdateWidgetRequest(BaseModel):
    description: str | None = None
    layout: WidgetLayout | None = None


class UpdateLayoutsRequest(BaseModel):
    layouts: list[dict[str, Any]]


# ── GET dashboard ──────────────────────────────────────────────────────────────

@router.get("/{user_email}")
async def get_dashboard(user_email: str):
    resp = _table().query(
        KeyConditionExpression=Key("user_email").eq(user_email),
        ScanIndexForward=True,
    )
    widgets = [_serialize(item) for item in resp.get("Items", [])]
    return {"widgets": widgets}


# ── ADD widget ─────────────────────────────────────────────────────────────────

@router.post("/{user_email}/widget")
async def add_widget(user_email: str, body: AddWidgetRequest):
    widget_id = str(uuid.uuid4())
    now = int(time.time())
    item = {
        "user_email": user_email,
        "widget_id": widget_id,
        "chart_title": body.chart_title,
        "chart_type": body.chart_type,
        "labels": body.labels,
        "values": [str(v) for v in body.values],
        "value_label": body.value_label,
        "color": body.color,
        "description": body.description,
        "layout_x": body.layout.x,
        "layout_y": body.layout.y,
        "layout_w": body.layout.w,
        "layout_h": body.layout.h,
        "created_at": now,
        "expires_at": now + _TTL_SECONDS,
    }
    _table().put_item(Item=item)
    return {"widget_id": widget_id}


# ── UPDATE widget (description / layout) ──────────────────────────────────────

@router.put("/{user_email}/widget/{widget_id}")
async def update_widget(user_email: str, widget_id: str, body: UpdateWidgetRequest):
    updates = []
    vals: dict[str, Any] = {}
    if body.description is not None:
        updates.append("description = :d")
        vals[":d"] = body.description
    if body.layout is not None:
        updates += ["layout_x = :x", "layout_y = :y", "layout_w = :w", "layout_h = :h"]
        vals.update({":x": body.layout.x, ":y": body.layout.y,
                     ":w": body.layout.w, ":h": body.layout.h})
    if not updates:
        raise HTTPException(400, "Nothing to update")
    _table().update_item(
        Key={"user_email": user_email, "widget_id": widget_id},
        UpdateExpression="SET " + ", ".join(updates),
        ExpressionAttributeValues=vals,
    )
    return {"ok": True}


# ── BULK update layouts (drag/resize save) ────────────────────────────────────

@router.put("/{user_email}/layouts")
async def update_layouts(user_email: str, body: UpdateLayoutsRequest):
    with _table().batch_writer() as batch:
        for lay in body.layouts:
            _table().update_item(
                Key={"user_email": user_email, "widget_id": lay["i"]},
                UpdateExpression="SET layout_x = :x, layout_y = :y, layout_w = :w, layout_h = :h",
                ExpressionAttributeValues={
                    ":x": lay.get("x", 0), ":y": lay.get("y", 0),
                    ":w": lay.get("w", 6), ":h": lay.get("h", 4),
                },
            )
    return {"ok": True}


# ── DELETE widget ──────────────────────────────────────────────────────────────

@router.delete("/{user_email}/widget/{widget_id}")
async def delete_widget(user_email: str, widget_id: str):
    _table().delete_item(Key={"user_email": user_email, "widget_id": widget_id})
    return {"ok": True}


# ── SHARE dashboard ────────────────────────────────────────────────────────────

@router.post("/{user_email}/share")
async def share_dashboard(user_email: str):
    # Check if share already exists
    try:
        resp = _share_table().query(
            IndexName="user_email-index",
            KeyConditionExpression=Key("user_email").eq(user_email),
            Limit=1,
        )
        items = resp.get("Items", [])
        if items:
            return {"share_id": items[0]["share_id"]}
    except Exception:
        pass

    share_id = str(uuid.uuid4()).replace("-", "")[:16]
    _share_table().put_item(Item={
        "share_id": share_id,
        "user_email": user_email,
        "created_at": int(time.time()),
        "expires_at": int(time.time()) + _TTL_SECONDS,
    })
    return {"share_id": share_id}


@router.get("/shared/{share_id}")
async def get_shared_dashboard(share_id: str):
    resp = _share_table().get_item(Key={"share_id": share_id})
    item = resp.get("Item")
    if not item:
        raise HTTPException(404, "Share link not found or expired")
    user_email = item["user_email"]
    resp2 = _table().query(
        KeyConditionExpression=Key("user_email").eq(user_email),
        ScanIndexForward=True,
    )
    widgets = [_serialize(w) for w in resp2.get("Items", [])]
    return {"widgets": widgets, "owner": user_email}


# ── helpers ────────────────────────────────────────────────────────────────────

def _serialize(item: dict) -> dict:
    return {
        "widget_id": item["widget_id"],
        "chart_title": item.get("chart_title", ""),
        "chart_type": item.get("chart_type", "bar"),
        "labels": item.get("labels", []),
        "values": [float(v) for v in item.get("values", [])],
        "value_label": item.get("value_label", ""),
        "color": item.get("color", "#6366f1"),
        "description": item.get("description", ""),
        "layout": {
            "x": int(item.get("layout_x", 0)),
            "y": int(item.get("layout_y", 0)),
            "w": int(item.get("layout_w", 6)),
            "h": int(item.get("layout_h", 4)),
        },
        "created_at": item.get("created_at", 0),
    }
