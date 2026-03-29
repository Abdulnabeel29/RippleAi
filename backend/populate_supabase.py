import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

import dotenv
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.models.base import Base
from app.models.news_article import NewsArticle
from app.models.event import Event
from app.services.ingestion_service import run_ingestion_pipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("populate_supabase")

async def main():
    dotenv.load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        logger.error("No DATABASE_URL found in .env")
        return

    logger.info(f"Connecting to: {db_url.split('@')[-1] if '@' in db_url else 'DATABASE'}")
    
    engine = create_async_engine(db_url, echo=True)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    
    try:
        # 1. Initialize Schema
        async with engine.begin() as conn:
            logger.info("Verifying tables...")
            await conn.run_sync(Base.metadata.create_all)
        
        # 2. Run Ingestion
        async with session_factory() as session:
            logger.info("Starting ingestion pipeline...")
            result = await run_ingestion_pipeline(session)
            logger.info(f"Ingestion results: {result}")
            
        # 3. Verify Counts
        async with engine.connect() as conn:
            articles = await conn.execute(text("SELECT count(*) FROM news_articles"))
            events = await conn.execute(text("SELECT count(*) FROM events"))
            print(f"\nFinal Reality Check:")
            print(f"NewsArticles: {articles.scalar()}")
            print(f"Events: {events.scalar()}")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
