import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine

from app.config import settings
from app.database.session import get_table
from app.database.models import TABLES, connection_item
from app.utils.crypto import encrypt, decrypt

logger = logging.getLogger(__name__)

_URL_TEMPLATES = {
    "postgres":  "postgresql+asyncpg://{username}:{password}@{host}:{port}/{database}",
    "mysql":     "mysql+aiomysql://{username}:{password}@{host}:{port}/{database}",
    "mssql":     "mssql+aioodbc://{username}:{password}@{host}:{port}/{database}?driver=ODBC+Driver+17+for+SQL+Server",
    "snowflake": "snowflake://{username}:{password}@{host}/{database}",
    "sqlite":    "sqlite+aiosqlite:///{host}",
}

_SYNC_URL_TEMPLATES = {
    "postgres":  "postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}",
    "mysql":     "mysql+pymysql://{username}:{password}@{host}:{port}/{database}",
    "mssql":     "mssql+pyodbc://{username}:{password}@{host}:{port}/{database}?driver=ODBC+Driver+17+for+SQL+Server",
    "snowflake": "snowflake://{username}:{password}@{host}/{database}",
    "sqlite":    "sqlite:///{host}",
}


def _build_url(template: str, creds: dict) -> str:
    return template.format(**creds)


async def test_connection(db_type: str, credentials: dict) -> dict:
    if db_type not in _URL_TEMPLATES:
        return {"ok": False, "error": f"Unsupported db_type '{db_type}'"}
    try:
        url = _build_url(_URL_TEMPLATES[db_type], credentials)
        engine = create_async_engine(url, connect_args={"connect_timeout": 5})
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


async def save_connection(
    db_type: str,
    credentials: dict,
    display_name: str,
    table_count: int = 0,
) -> str:
    connection_id = str(uuid.uuid4())

    # Encrypt full credentials blob and store in DynamoDB
    encrypted_creds = encrypt(json.dumps({**credentials, "db_type": db_type}))

    item = connection_item(
        connection_id=connection_id,
        display_name=display_name,
        db_type=db_type,
        host=credentials.get("host"),
        port=credentials.get("port"),
        database=credentials.get("database"),
        username=credentials.get("username"),
        table_count=table_count,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    item["encrypted_creds"] = encrypted_creds
    get_table(TABLES["connections"]).put_item(Item=item)

    return connection_id


def _get_creds(connection_id: str) -> dict:
    resp = get_table(TABLES["connections"]).get_item(Key={"connection_id": connection_id})
    item = resp.get("Item")
    if not item or "encrypted_creds" not in item:
        raise ValueError(f"Connection not found: {connection_id}")
    return json.loads(decrypt(item["encrypted_creds"]))


async def get_engine(connection_id: str) -> AsyncEngine:
    creds = _get_creds(connection_id)
    db_type = creds.pop("db_type")
    template = _URL_TEMPLATES.get(db_type)
    if not template:
        raise ValueError(f"Unsupported db_type: {db_type}")
    return create_async_engine(_build_url(template, creds), pool_size=1, max_overflow=0, pool_pre_ping=True)


def get_sync_engine(connection_id: str):
    from sqlalchemy import create_engine
    creds = _get_creds(connection_id)
    db_type = creds.pop("db_type")
    url = _build_url(_SYNC_URL_TEMPLATES[db_type], creds)
    return create_engine(url, pool_size=1, max_overflow=0, connect_args={"connect_timeout": 10})


async def list_connections() -> list[dict]:
    resp = get_table(TABLES["connections"]).scan(
        ProjectionExpression="connection_id, display_name, db_type, host, #db, username, table_count, created_at",
        ExpressionAttributeNames={"#db": "database"},
    )
    return resp.get("Items", [])


async def get_connection(connection_id: str) -> dict | None:
    resp = get_table(TABLES["connections"]).get_item(
        Key={"connection_id": connection_id},
        ProjectionExpression="connection_id, display_name, db_type, host, port, #db, username, table_count, created_at",
        ExpressionAttributeNames={"#db": "database"},
    )
    return resp.get("Item")


async def delete_connection(connection_id: str) -> None:
    get_table(TABLES["connections"]).delete_item(Key={"connection_id": connection_id})
