import asyncio
import logging
from app.core.database import async_session_factory
from app.services.prediction_service import prediction_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def refresh():
    logger.info("Manually triggering prediction refresh...")
    async with async_session_factory() as db:
        await prediction_service.update_predictions(db)
    logger.info("Prediction refresh complete.")

if __name__ == "__main__":
    asyncio.run(refresh())
