"""
Backfills Neo4j graph mappings for all existing relational events.

For each event in the SQL database, this script ensures the corresponding
Event -> Industry and Event -> Location graph links exist (MERGE semantics
inside graph_service keep this idempotent).
"""

import asyncio
import logging

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.event import Event
from app.services.graph_service import graph_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def backfill_graph() -> None:
    """Backfills all relational events into Neo4j graph mappings."""
    inserted = 0
    skipped = 0

    await graph_service.connect()
    try:
        async with async_session_factory() as db:
            result = await db.execute(select(Event))
            events = result.scalars().all()
            logger.info("Found %d events to backfill.", len(events))

            for event in events:
                industry = (event.industry or "unknown").strip() or "unknown"
                location = (event.location or "unknown").strip() or "unknown"
                severity = (event.severity or "low").strip() or "low"
                event_type = (event.event_type or "unknown").strip() or "unknown"

                try:
                    await graph_service.insert_event_to_graph(
                        event_id=event.id,
                        industry=industry,
                        location=location,
                        severity=severity,
                        event_type=event_type,
                    )
                    inserted += 1
                except Exception as exc:
                    skipped += 1
                    logger.warning(
                        "Skipping event_id=%s due to graph insert failure: %s",
                        event.id,
                        str(exc),
                    )
    finally:
        await graph_service.close()

    logger.info(
        "Graph backfill complete. inserted_or_merged=%d skipped=%d",
        inserted,
        skipped,
    )


if __name__ == "__main__":
    asyncio.run(backfill_graph())
