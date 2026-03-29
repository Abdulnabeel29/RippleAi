import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

# Add the current directory to sys.path for local app imports
sys.path.append(os.path.join(os.getcwd(), 'app'))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.database import create_tables
from app.models.news_article import NewsArticle
from app.models.event import Event
from app.models.prediction import Prediction
from app.services.ingestion_service import run_ingestion_pipeline
from app.services.prediction_service import prediction_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("populate_supabase_v2")

async def verify_counts(session: AsyncSession):
    """Prints the current row counts for all main tables."""
    for model in [NewsArticle, Event, Prediction]:
        stmt = select(func.count()).select_from(model)
        result = await session.execute(stmt)
        count = result.scalar()
        logger.info(f"Table {model.__tablename__} count: {count}")

async def main():
    settings = get_settings()
    logger.info(f"Using DATABASE_URL: {settings.DATABASE_URL[:20]}...")

    # 1. Initialize Tables
    logger.info("Initializing Supabase schema...")
    await create_tables()

    # Create engine and session
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 2. Run Ingestion Pipeline
        logger.info("Starting Full Ingestion Pipeline (News -> Events)...")
        ingest_result = await run_ingestion_pipeline(session)
        logger.info(f"Ingestion Finished: {ingest_result}")

        # 3. Trigger Prediction Engine
        logger.info("Generating Risk Predictions from detected events...")
        await prediction_service.update_predictions(session)
        logger.info("Prediction engine cycle complete.")

        # 4. Final Reality Check
        logger.info("--- FINAL DATABASE STATE ---")
        await verify_counts(session)
        logger.info("-----------------------------")

    await engine.dispose()
    logger.info("Supabase population script finished.")

if __name__ == "__main__":
    asyncio.run(main())
