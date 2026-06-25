import json
import logging
import time
from typing import Any

import boto3
from sqlalchemy import inspect

from app.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_TABLES = {
    "saved_report", "conversation_log", "connection",
    "sqlite_sequence", "peewee_migrations",
}

_dynamo = boto3.resource("dynamodb", region_name=settings.aws_region_name)


class SchemaIndexer:

    @staticmethod
    def reflect(engine) -> list[dict[str, Any]]:
        """Reflect all non-system tables from a sync SQLAlchemy engine."""
        inspector = inspect(engine)
        tables = []

        for table_name in inspector.get_table_names():
            if table_name.lower() in _SYSTEM_TABLES:
                continue

            columns = [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                }
                for col in inspector.get_columns(table_name)
            ]

            pk_cols = inspector.get_pk_constraint(table_name).get("constrained_columns", [])

            fks = [
                {
                    "column": fk["constrained_columns"][0] if fk["constrained_columns"] else "",
                    "references": f"{fk['referred_table']}.{fk['referred_columns'][0]}" if fk["referred_columns"] else "",
                }
                for fk in inspector.get_foreign_keys(table_name)
            ]

            tables.append({
                "name": table_name,
                "columns": columns,
                "primary_keys": pk_cols,
                "foreign_keys": fks,
            })

        logger.info("Reflected %d tables", len(tables))
        return tables

    @staticmethod
    async def cache(connection_id: str, schema: list[dict]) -> None:
        """Write reflected schema to DynamoDB with 12hr TTL."""
        table = _dynamo.Table(settings.dynamodb_schema_cache_table)
        expires_at = int(time.time()) + 43_200  # 12 hours

        table.put_item(Item={
            "connection_id": connection_id,
            "schema": json.dumps(schema),
            "table_count": len(schema),
            "expires_at": expires_at,
        })
        logger.info("Cached schema for connection %s (%d tables)", connection_id, len(schema))

    @staticmethod
    async def load(connection_id: str) -> list[dict] | None:
        """Load schema from DynamoDB cache. Returns None if expired or missing."""
        table = _dynamo.Table(settings.dynamodb_schema_cache_table)
        resp = table.get_item(Key={"connection_id": connection_id})
        item = resp.get("Item")
        if not item:
            return None
        return json.loads(item["schema"])

    @staticmethod
    async def delete_cache(connection_id: str) -> None:
        table = _dynamo.Table(settings.dynamodb_schema_cache_table)
        table.delete_item(Key={"connection_id": connection_id})

    @staticmethod
    def select_relevant_tables(
        schema: list[dict],
        query: str,
        max_tables: int = 10,
    ) -> list[dict]:
        """Return the most relevant tables for a user query via keyword match + FK expansion."""
        query_tokens = set(query.lower().split())
        scored: list[tuple[int, dict]] = []

        for table in schema:
            score = 0
            table_tokens = set(table["name"].lower().replace("_", " ").split())
            score += len(query_tokens & table_tokens) * 3

            for col in table["columns"]:
                col_tokens = set(col["name"].lower().replace("_", " ").split())
                score += len(query_tokens & col_tokens)

            scored.append((score, table))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_tables = [t for _, t in scored[:max_tables]]

        # FK expansion — include referenced tables not already in top_tables
        top_names = {t["name"] for t in top_tables}
        for table in list(top_tables):
            for fk in table.get("foreign_keys", []):
                ref_table = fk.get("references", "").split(".")[0]
                if ref_table and ref_table not in top_names:
                    for t in schema:
                        if t["name"] == ref_table:
                            top_tables.append(t)
                            top_names.add(ref_table)
                            break

        return top_tables[:max_tables]

    @staticmethod
    def schema_to_ddl(tables: list[dict]) -> str:
        """Convert table metadata to CREATE TABLE DDL string for LLM context."""
        lines = []
        for t in tables:
            col_defs = []
            for col in t["columns"]:
                nullable = "" if col["nullable"] else " NOT NULL"
                pk = " PRIMARY KEY" if col["name"] in t.get("primary_keys", []) else ""
                col_defs.append(f"  {col['name']} {col['type']}{pk}{nullable}")
            for fk in t.get("foreign_keys", []):
                if fk.get("column") and fk.get("references"):
                    col_defs.append(f"  FOREIGN KEY ({fk['column']}) REFERENCES {fk['references']}")
            lines.append(f"CREATE TABLE {t['name']} (\n" + ",\n".join(col_defs) + "\n);")
        return "\n\n".join(lines)
