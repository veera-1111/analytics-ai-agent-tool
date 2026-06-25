import time
import logging
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key

from app.config import settings

logger = logging.getLogger(__name__)

_dynamo = boto3.resource("dynamodb", region_name=settings.aws_region_name)
_TTL_SECONDS = 86_400  # 24 hours


class DynamoSessionStore:

    @staticmethod
    def _table():
        return _dynamo.Table(settings.dynamodb_sessions_table)

    @staticmethod
    async def get_history(session_id: str, limit: int = 10) -> list[dict[str, Any]]:
        resp = DynamoSessionStore._table().query(
            KeyConditionExpression=Key("session_id").eq(session_id),
            ScanIndexForward=True,  # oldest first
            Limit=limit,
        )
        return [
            {"role": item["role"], "content": item["content"]}
            for item in resp.get("Items", [])
        ]

    @staticmethod
    async def append(session_id: str, role: str, content: str) -> None:
        ts = str(time.time())
        DynamoSessionStore._table().put_item(Item={
            "session_id": session_id,
            "timestamp": ts,
            "role": role,
            "content": content,
            "expires_at": int(time.time()) + _TTL_SECONDS,
        })
