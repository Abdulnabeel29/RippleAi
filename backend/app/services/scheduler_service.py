"""
Background News Polling Scheduler.

Runs the ingestion pipeline automatically at a fixed interval so the
dashboard always shows the latest supply chain disruptions without
any manual trigger.

Uses APScheduler's AsyncIOScheduler so the job runs inside the same
event loop as the FastAPI app without blocking request handling.
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.database import async_session_factory
from app.services.ingestion_service import run_ingestion_pipeline

logger = logging.getLogger(__name__)

# How often to poll NewsAPI and run AI event detection (minutes)
POLL_INTERVAL_MINUTES = 30

scheduler = AsyncIOScheduler()


async def _scheduled_ingestion() -> None:
    """
    Job callback executed by the scheduler.

    Opens a fresh DB session, runs the full ingestion pipeline,
    and closes the session on completion or error.
    """
    logger.info("[Scheduler] Starting scheduled news ingestion...")
    try:
        from app.services.prediction_service import prediction_service
        
        async with async_session_factory() as db:
            result = await run_ingestion_pipeline(db)
            logger.info(
                "[Scheduler] Ingestion done — fetched=%d, new=%d, events=%d, errors=%d",
                result["articles_fetched"],
                result["articles_new"],
                result["events_detected"],
                result["errors"],
            )
            
            logger.info("[Scheduler] Updating generative AI predictions...")
            await prediction_service.update_predictions(db)
            logger.info("[Scheduler] Predictions generated and stored successfully.")
            
    except Exception as exc:
        logger.error("[Scheduler] Pipeline failed: %s: %s", type(exc).__name__, str(exc))


def start_scheduler() -> None:
    """
    Registers the ingestion job and starts the scheduler.

    Called once during FastAPI lifespan startup. The job runs
    immediately on startup and then every POLL_INTERVAL_MINUTES.
    """
    scheduler.add_job(
        _scheduled_ingestion,
        trigger=IntervalTrigger(minutes=POLL_INTERVAL_MINUTES),
        id="news_ingestion",
        name="Scheduled News Ingestion",
        replace_existing=True,
        # Run immediately when the server starts, not after waiting one full interval
        next_run_time=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )
    scheduler.start()
    logger.info(
        "[Scheduler] News ingestion scheduler started — polling every %d minutes.",
        POLL_INTERVAL_MINUTES,
    )


def stop_scheduler() -> None:
    """Shuts down the scheduler gracefully on app shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] News ingestion scheduler stopped.")
