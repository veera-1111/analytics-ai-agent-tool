"""
FastAPI application entry-point.

- Initialises the Peewee SQLite database connection on startup
- Mounts all API routers
- Configures CORS for the trusted host origins
- No authentication middleware — single implicit user role
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.models import ALL_MODELS, db, init_db
from app.routes.health import router as health_router
from app.routes.reports import router as reports_router
from app.routes.chat import router as chat_router
from app.routes.export import router as export_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # ── Startup ───────────────────────────────────────────
    init_db(settings.db_path)
    db.connect(reuse_if_open=True)
    db.create_tables(ALL_MODELS, safe=True)
    print(f"✓ Database connected: {settings.db_path}")
    print(f"✓ AI Provider: {settings.ai_provider}")

    yield

    # ── Shutdown ──────────────────────────────────────────
    if not db.is_closed():
        db.close()


app = FastAPI(
    title="Analytics AI Agent API",
    version="0.1.0",
    description="Logistics analytics powered by natural language queries",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────
origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────
app.include_router(health_router)
app.include_router(reports_router)
app.include_router(chat_router)
app.include_router(export_router)
