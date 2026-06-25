"""
No-op init — DynamoDB tables are created by Terraform.
Kept so lifespan hook in main.py can call create_tables() without changes.
"""

import logging

logger = logging.getLogger(__name__)


async def create_tables() -> None:
    logger.info("DynamoDB tables managed by Terraform — no init required.")
