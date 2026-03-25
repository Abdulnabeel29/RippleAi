"""
FastAPI application entrypoint.

Configures the application with:
- Lifespan handler for startup/shutdown (database table creation)
- CORS middleware
- Router registration for all API endpoints
- Centralized logging
"""

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import create_tables
from app.core.logging import setup_logging
from app.routes import events, health, ingestion, predictions
from app.services.graph_service import graph_service

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Application lifespan handler.

    Runs database table creation on startup and logs shutdown.

    Args:
        app: The FastAPI application instance.
    """
    # ── Startup ─────────────────────────────────────────────
    setup_logging()
    logger.info("Starting Global Supply Chain Intelligence Engine...")
    await create_tables()
    await graph_service.connect()
    logger.info("Application startup complete.")
    yield
    # ── Shutdown ────────────────────────────────────────────
    logger.info("Application shutting down.")
    await graph_service.close()


app = FastAPI(
    title="Global Supply Chain Intelligence Engine",
    description=(
        "AI-powered platform for detecting, analyzing, and predicting "
        "supply chain disruptions using real-time global data."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS Middleware ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ───────────────────────────────────────────
app.include_router(health.router)
app.include_router(ingestion.router)
app.include_router(events.router)
app.include_router(predictions.router)
