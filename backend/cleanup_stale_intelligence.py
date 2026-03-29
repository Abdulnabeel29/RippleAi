import asyncio
import logging
from sqlalchemy import select, update, or_
from app.core.database import async_session_factory
from app.models.prediction import Prediction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STALE_SAMPLES = [
    "Strategic factor analysis pending...",
    "Operational propagation delta pending...",
    "Predictive intelligence synthesis interrupted.",
    "Operational risk model offline."
]

async def cleanup():
    logger.info("Starting intelligence cleanup for stale AI fallbacks...")
    async with async_session_factory() as db:
        async with db.begin():
            # Find all predictions where why or how match any of the stale strings
            stmt = select(Prediction).where(
                or_(
                    Prediction.why.in_(STALE_SAMPLES),
                    Prediction.how.in_(STALE_SAMPLES)
                )
            )
            result = await db.execute(stmt)
            to_clear = result.scalars().all()
            
            count = len(to_clear)
            if count == 0:
                logger.info("No stale intelligence found. Database is clean.")
                return

            # Clear them
            for p in to_clear:
                p.why = None
                p.how = None
            
            logger.info(f"Successfully cleared intelligence for {count} forecasts.")
    
    logger.info("Cleanup complete. AI scanning will resume for these records on next visit.")

if __name__ == "__main__":
    asyncio.run(cleanup())
