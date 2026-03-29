import asyncio
import logging
from sqlalchemy import text
from app.core.database import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_schema():
    logger.info("Connecting to SQLite database to fix schema...")
    async with engine.begin() as conn:
        # Try adding columns one by one
        for col in ["why", "how"]:
            try:
                await conn.execute(text(f"ALTER TABLE predictions ADD COLUMN {col} TEXT"))
                logger.info(f"Column '{col}' added successfully.")
            except Exception as e:
                if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                    logger.info(f"Column '{col}' already exists, skipping.")
                else:
                    logger.error(f"Failed to add column '{col}': {e}")
    logger.info("Database schema fix complete.")

if __name__ == "__main__":
    asyncio.run(fix_schema())
