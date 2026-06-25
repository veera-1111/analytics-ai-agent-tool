"""
DynamoDB table name constants and item schema helpers.
No ORM — all persistence goes directly through boto3 DynamoDB client.
"""

TABLES = {
    "connections":        "QuantixAI-Connections",
    "reports":            "QuantixAI-Reports",
    "conversation_logs":  "QuantixAI-ConversationLogs",
    "sessions":           "QuantixAI-Sessions",
    "schema_cache":       "QuantixAI-SchemaCache",
}


def connection_item(connection_id: str, display_name: str, db_type: str,
                    host: str | None, port: int | None, database: str | None,
                    username: str | None, table_count: int, created_at: str) -> dict:
    item = {
        "connection_id": connection_id,
        "display_name":  display_name,
        "db_type":       db_type,
        "table_count":   table_count,
        "created_at":    created_at,
    }
    if host:     item["host"] = host
    if port:     item["port"] = port
    if database: item["database"] = database
    if username: item["username"] = username
    return item


def report_item(report_id: str, connection_id: str, title: str,
                sql_query: str | None, created_at: str, expires_at: int) -> dict:
    item = {
        "report_id":     report_id,
        "connection_id": connection_id,
        "title":         title,
        "created_at":    created_at,
        "expires_at":    expires_at,
    }
    if sql_query: item["sql_query"] = sql_query
    return item


def conversation_log_item(session_id: str, created_at: str, role: str,
                          content: str, connection_id: str | None,
                          expires_at: int) -> dict:
    item = {
        "session_id":  session_id,
        "created_at":  created_at,
        "role":        role,
        "content":     content,
        "expires_at":  expires_at,
    }
    if connection_id: item["connection_id"] = connection_id
    return item
