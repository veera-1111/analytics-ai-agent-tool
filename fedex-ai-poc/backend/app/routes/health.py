"""
Health-check routes.

Endpoints:
  GET /api/health       — application liveness
  GET /api/health/db    — SQLite database connectivity
  GET /api/health/redis — Redis connectivity
"""

from fastapi import APIRouter
import redis as redis_lib

from app.config import settings
from app.database.models import db

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health():
    """Application liveness check."""
    return {"status": "ok", "service": "analytics-ai-agent"}


@router.get("/db")
async def health_db():
    """SQLite database connectivity check."""
    try:
        db.execute_sql("SELECT 1")
        return {"status": "ok", "database": settings.db_path}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


@router.get("/redis")
async def health_redis():
    """Redis connectivity check."""
    try:
        r = redis_lib.from_url(settings.redis_url)
        r.ping()
        return {"status": "ok", "redis": settings.redis_url}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}
