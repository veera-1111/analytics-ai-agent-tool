import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.connections.manager import (
    delete_connection,
    get_connection,
    get_sync_engine,
    list_connections,
    save_connection,
    test_connection,
)
from app.database.session import get_table
from app.database.models import TABLES
from app.schema.indexer import SchemaIndexer

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/connections", tags=["connections"])


class ConnectionRequest(BaseModel):
    display_name: str
    db_type: str
    host: str | None = None
    port: int | None = None
    database: str | None = None
    username: str | None = None
    password: str | None = None


class TestConnectionRequest(BaseModel):
    db_type: str
    host: str | None = None
    port: int | None = None
    database: str | None = None
    username: str | None = None
    password: str | None = None


@router.post("/test")
async def test_db_connection(req: TestConnectionRequest) -> dict[str, Any]:
    creds = req.model_dump(exclude={"db_type"})
    result = await test_connection(req.db_type, creds)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"status": "connected"}


@router.post("")
async def create_connection(req: ConnectionRequest) -> dict[str, Any]:
    creds = req.model_dump(exclude={"display_name", "db_type"})

    test_result = await test_connection(req.db_type, creds)
    if not test_result["ok"]:
        raise HTTPException(status_code=400, detail=test_result["error"])

    connection_id = await save_connection(req.db_type, creds, req.display_name)

    table_count = 0
    try:
        sync_engine = get_sync_engine(connection_id)
        schema = SchemaIndexer.reflect(sync_engine)
        sync_engine.dispose()
        await SchemaIndexer.cache(connection_id, schema)
        table_count = len(schema)

        get_table(TABLES["connections"]).update_item(
            Key={"connection_id": connection_id},
            UpdateExpression="SET table_count = :tc",
            ExpressionAttributeValues={":tc": table_count},
        )
    except Exception as exc:
        logger.warning("Schema indexing failed for %s: %s", connection_id, exc)

    return {
        "connection_id": connection_id,
        "display_name": req.display_name,
        "db_type": req.db_type,
        "table_count": table_count,
        "status": "connected",
    }


@router.get("")
async def list_all_connections() -> list[dict[str, Any]]:
    return await list_connections()


@router.get("/{connection_id}")
async def get_one_connection(connection_id: str) -> dict[str, Any]:
    record = await get_connection(connection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Connection not found")
    return record


@router.delete("/{connection_id}", status_code=204)
async def remove_connection(connection_id: str) -> None:
    await delete_connection(connection_id)
    await SchemaIndexer.delete_cache(connection_id)


@router.post("/{connection_id}/refresh-schema")
async def refresh_schema(connection_id: str) -> dict[str, Any]:
    record = await get_connection(connection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Connection not found")

    sync_engine = get_sync_engine(connection_id)
    schema = SchemaIndexer.reflect(sync_engine)
    sync_engine.dispose()
    await SchemaIndexer.cache(connection_id, schema)

    get_table(TABLES["connections"]).update_item(
        Key={"connection_id": connection_id},
        UpdateExpression="SET table_count = :tc",
        ExpressionAttributeValues={":tc": len(schema)},
    )

    from datetime import datetime, timezone
    return {"table_count": len(schema), "refreshed_at": datetime.now(timezone.utc).isoformat()}
