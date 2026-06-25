import re
import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

_MUTATION_PATTERN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|CREATE|TRUNCATE|ALTER|REPLACE|MERGE|UPSERT|EXEC|EXECUTE|GRANT|REVOKE)\b",
    re.IGNORECASE,
)


class ReadOnlyExecutor:
    @staticmethod
    async def execute(engine: AsyncEngine, sql: str, limit: int = 10_000) -> dict[str, Any]:
        """Execute a SELECT-only query. Raises ValueError for mutation attempts."""
        stripped = sql.strip()
        if not re.match(r"^\s*(SELECT|WITH)\b", stripped, re.IGNORECASE):
            raise ValueError("Only SELECT queries are permitted.")
        if _MUTATION_PATTERN.search(stripped):
            raise ValueError("Only SELECT queries are permitted.")

        # Inject LIMIT if not present and query is a simple SELECT
        if re.match(r"^\s*SELECT\b", stripped, re.IGNORECASE):
            if "LIMIT" not in stripped.upper():
                stripped = f"{stripped.rstrip(';')} LIMIT {limit}"

        async with engine.connect() as conn:
            result = await conn.execute(
                text(stripped).execution_options(timeout=30)
            )
            columns = list(result.keys())
            rows = result.fetchmany(limit)
            data = [dict(zip(columns, row)) for row in rows]

        return {"columns": columns, "data": data, "row_count": len(data)}
