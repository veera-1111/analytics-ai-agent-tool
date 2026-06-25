from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── DynamoDB ──────────────────────────────────────────
    dynamodb_sessions_table: str = "QuantixAI-Sessions"
    dynamodb_schema_cache_table: str = "QuantixAI-SchemaCache"
    dynamodb_connections_table: str = "QuantixAI-Connections"
    dynamodb_reports_table: str = "QuantixAI-Reports"
    dynamodb_conversation_logs_table: str = "QuantixAI-ConversationLogs"

    # ── S3 ────────────────────────────────────────────────
    s3_exports_bucket: str = "quantixai-exports"

    # ── Encryption (AES-256-GCM, key as 64-char hex) ──────
    credentials_encryption_key: str = ""

    # ── AWS ───────────────────────────────────────────────
    aws_region_name: str = "us-east-1"
    bedrock_model_id: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"

    # ── CORS ──────────────────────────────────────────────
    allowed_origins: str = "*"

    # ── Server ────────────────────────────────────────────
    log_level: str = "info"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
