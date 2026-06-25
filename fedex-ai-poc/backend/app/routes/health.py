from fastapi import APIRouter
import boto3
from app.config import settings

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health():
    return {"status": "ok", "service": "quantixai"}


@router.get("/db")
async def health_db():
    try:
        dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region_name)
        dynamodb.Table(settings.dynamodb_connections_table).load()
        return {"status": "ok", "store": "dynamodb"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}
