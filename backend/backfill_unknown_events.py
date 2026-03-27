"""
Backfill Unknown Events Script.

Re-runs Gemini AI classification on all events where event_type='unknown',
using the source article text stored in the news_articles table.
Updates the event record in-place with the newly detected values.

Usage:
    python backfill_unknown_events.py

Requirements:
    - Valid GEMINI_API_KEY in .env
    - Backend not required to be running — connects to DB directly
"""

import asyncio
import logging

from dotenv import load_dotenv

load_dotenv(override=True)

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.event import Event
from app.models.news_article import NewsArticle
from app.services.event_detection_service import detect_event

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
logger = logging.getLogger("backfill")

# Force fresh settings load (bypasses lru_cache)
settings = get_settings.__wrapped__() if hasattr(get_settings, "__wrapped__") else get_settings()


async def run_backfill() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Load all events with unknown fields
        result = await session.execute(
            select(Event).where(Event.event_type == "unknown")
        )
        unknown_events = result.scalars().all()
        total = len(unknown_events)

        if total == 0:
            logger.info("No unknown events found — database is clean!")
            return

        logger.info(f"Found {total} events with event_type='unknown'. Starting re-classification...")

        success = 0
        skipped = 0
        failed = 0

        for i, event in enumerate(unknown_events, 1):
            logger.info(f"[{i}/{total}] Processing event {event.id}...")

            # Fetch the source article if linked
            article_text = ""
            if event.source_article_id:
                art_result = await session.execute(
                    select(NewsArticle).where(NewsArticle.id == event.source_article_id)
                )
                article = art_result.scalar_one_or_none()
                if article:
                    parts = [
                        article.title or "",
                        article.description or "",
                        article.content or "",
                    ]
                    article_text = " ".join(p for p in parts if p).strip()

            if not article_text:
                logger.warning(f"  No article text available for event {event.id} — skipping.")
                skipped += 1
                continue

            # Re-run Gemini detection
            try:
                detected = await detect_event(article_text)

                if detected is None:
                    logger.info(f"  Gemini classified as non-disruption. Marking as 'noise'.")
                    await session.execute(
                        update(Event)
                        .where(Event.id == event.id)
                        .values(event_type="noise", status="resolved")
                    )
                elif detected.event_type == "unknown":
                    logger.warning(f"  Gemini returned 'unknown' again for {event.id} — skipping update.")
                    skipped += 1
                    continue
                else:
                    logger.info(
                        f"  Re-classified: type={detected.event_type}, "
                        f"location={detected.location}, severity={detected.severity}"
                    )
                    await session.execute(
                        update(Event)
                        .where(Event.id == event.id)
                        .values(
                            event_type=detected.event_type,
                            location=detected.location,
                            country=detected.country,
                            industry=detected.industry,
                            severity=detected.severity,
                            confidence_score=detected.confidence_score,
                            summary=detected.summary,
                        )
                    )
                    success += 1

                await session.commit()

                # Respect Gemini rate limits (free tier: ~15 rpm)
                await asyncio.sleep(4.5)

            except Exception as exc:
                logger.error(f"  Failed to process event {event.id}: {exc}")
                failed += 1
                await asyncio.sleep(5)

    await engine.dispose()

    print("\n" + "=" * 55)
    print(f"  BACKFILL COMPLETE")
    print(f"  Total processed : {total}")
    print(f"  Re-classified   : {success}")
    print(f"  Skipped         : {skipped}")
    print(f"  Failed          : {failed}")
    print("=" * 55)


if __name__ == "__main__":
    asyncio.run(run_backfill())
