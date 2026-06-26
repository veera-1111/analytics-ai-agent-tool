from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.init import create_tables
from app.routes.health import router as health_router
from app.routes.reports import router as reports_router
from app.routes.chat import router as chat_router
from app.routes.export import router as export_router
from app.routes.connections import router as connections_router
from app.routes.history import router as history_router
from app.routes.dashboard import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(
    title="QuantixAI API",
    version="1.0.0",
    description="Intelligent analytics powered by natural language — connect any database",
    lifespan=lifespan,
)

origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(connections_router)
app.include_router(chat_router)
app.include_router(reports_router)
app.include_router(export_router)
app.include_router(history_router)
app.include_router(dashboard_router)
