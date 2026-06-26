import time
import logging
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key

from app.config import settings

logger = logging.getLogger(__name__)

_dynamo = boto3.resource("dynamodb", region_name=settings.aws_region_name)
_TTL_SECONDS = 86_400 * 30  # 30 days


class DynamoSessionStore:

    @staticmethod
    def _table():
        return _dynamo.Table(settings.dynamodb_sessions_table)

    @staticmethod
    def _user_sessions_table():
        return _dynamo.Table("QuantixAI-UserSessions")

    @staticmethod
    async def get_history(session_id: str, limit: int = 20) -> list[dict[str, Any]]:
        resp = DynamoSessionStore._table().query(
            KeyConditionExpression=Key("session_id").eq(session_id),
            ScanIndexForward=True,
            Limit=limit,
        )
        return [
            {"role": item["role"], "content": item["content"]}
            for item in resp.get("Items", [])
        ]

    @staticmethod
    async def append(session_id: str, role: str, content: str, user_email: str = "") -> None:
        ts = str(time.time())
        item = {
            "session_id": session_id,
            "timestamp": ts,
            "role": role,
            "content": content,
            "expires_at": int(time.time()) + _TTL_SECONDS,
        }
        if user_email:
            item["user_email"] = user_email
        DynamoSessionStore._table().put_item(Item=item)

    @staticmethod
    async def upsert_user_session(
        user_email: str,
        session_id: str,
        first_message: str,
        connection_name: str = "",
    ) -> None:
        """Create/update the session metadata row in UserSessions table."""
        import datetime
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        DynamoSessionStore._user_sessions_table().update_item(
            Key={"user_email": user_email, "session_id": session_id},
            UpdateExpression="SET first_message = if_not_exists(first_message, :fm), "
                             "started_at = if_not_exists(started_at, :sa), "
                             "connection_name = :cn, "
                             "last_active = :la, "
                             "expires_at = :ex",
            ExpressionAttributeValues={
                ":fm": first_message[:120],
                ":sa": now,
                ":cn": connection_name,
                ":la": now,
                ":ex": int(time.time()) + _TTL_SECONDS,
            },
        )

    @staticmethod
    async def get_user_sessions(user_email: str, limit: int = 30) -> list[dict[str, Any]]:
        """Return session metadata list for a user, newest first."""
        resp = DynamoSessionStore._user_sessions_table().query(
            KeyConditionExpression=Key("user_email").eq(user_email),
            ScanIndexForward=False,
            Limit=limit,
        )
        return [
            {
                "session_id": item["session_id"],
                "first_message": item.get("first_message", ""),
                "started_at": item.get("started_at", ""),
                "last_active": item.get("last_active", ""),
                "connection_name": item.get("connection_name", ""),
            }
            for item in resp.get("Items", [])
        ]
