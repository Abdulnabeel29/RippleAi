"""
Async database engine and session management.

Provides the SQLAlchemy async engine, session factory, and a FastAPI
dependency for injecting database sessions into route handlers.
"""

import logging
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Determine engine kwargs based on database type
_engine_kwargs: dict = {}
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite does not support pool_size/max_overflow
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_size"] = 10
    _engine_kwargs["max_overflow"] = 20
    _engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.APP_ENV == "development"),
    **_engine_kwargs,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an async database session.

    The session is automatically closed after the request completes.

    Yields:
        AsyncSession: An active database session.
    """
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables() -> None:
    """
    Creates all database tables defined by SQLAlchemy models.

    Should be called once during application startup.
    """
    from app.models.base import Base  # noqa: E402 — deferred to avoid circular imports
    from app.models.news_article import NewsArticle  # noqa: F401 — register model
    from app.models.event import Event  # noqa: F401 — register model

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created successfully.")
