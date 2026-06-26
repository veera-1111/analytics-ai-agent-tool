"""
Demo mode agent — downloads the demo SQLite from S3 once per Lambda container
lifetime, then delegates to ClaudeAgent exactly like a real DB connection.
connection_id "demo" is pre-seeded in DynamoDB with db_type=sqlite and
host=/tmp/demo_logistics.db so the existing engine/schema machinery works.
"""
import logging
import os
from typing import Any

import boto3

from app.config import settings

logger = logging.getLogger(__name__)

_S3_KEY    = "demo/demo_logistics.db"
_LOCAL_PATH = "/tmp/demo_logistics.db"

_db_ready = False


def _ensure_db() -> None:
    global _db_ready
    if _db_ready and os.path.exists(_LOCAL_PATH):
        return
    bucket = settings.s3_exports_bucket
    logger.info("DemoAgent: downloading demo SQLite from s3://%s/%s", bucket, _S3_KEY)
    s3 = boto3.client("s3", region_name=settings.aws_region_name)
    s3.download_file(bucket, _S3_KEY, _LOCAL_PATH)
    _db_ready = True
    logger.info("DemoAgent: demo DB ready at %s (%d bytes)", _LOCAL_PATH, os.path.getsize(_LOCAL_PATH))


class DemoAgent:

    @staticmethod
    async def run(message: str, session_history: list[dict]) -> dict[str, Any]:
        from app.agent.claude_agent import ClaudeAgent  # local import avoids circular

        try:
            _ensure_db()
        except Exception as exc:
            logger.error("DemoAgent: failed to download demo DB: %s", exc)
            return {
                "reply": "Demo database is temporarily unavailable. Please try again in a moment.",
                "response_type": "text",
            }

        # Delegate to the full ClaudeAgent with connection_id="demo".
        # DynamoDB already has the connection record + schema cache for "demo".
        return await ClaudeAgent.run(message, "demo", session_history)
