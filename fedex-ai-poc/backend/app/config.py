"""
Application settings loaded from environment variables.

All configuration is centralised here so that routes, agent, and database
modules import a single `settings` instance.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Pydantic settings — values come from .env / environment."""

    # ── Database ──────────────────────────────────────────
    db_path: str = "/data/analytics.db"

    # ── Redis ─────────────────────────────────────────────
    redis_url: str = "redis://redis:6379/0"

    # ── AI provider ───────────────────────────────────────
    ai_provider: str = "mock"  # mock | bedrock

    # ── AWS Bedrock ───────────────────────────────────────
    aws_region: str = "us-east-1"
    aws_profile: str | None = None
    bedrock_model_id: str = "us.meta.llama3-1-70b-instruct-v1:0"

    # ── CORS / Embedding ──────────────────────────────────
    allowed_origins: str = "http://localhost:8080,http://localhost:8081"
    frame_ancestors: str = "http://localhost:8081"

    # ── Server ────────────────────────────────────────────
    backend_port: int = 8000
    log_level: str = "info"

    # ── Frontend ──────────────────────────────────────────
    next_public_api_base_url: str = "/api"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
