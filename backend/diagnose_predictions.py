"""
Diagnostic script to understand why predictions are sparse.
Checks: unique event_type+location combos, current predictions, and runs update manually.
"""
import asyncio
import sys, os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select, func, text
from app.core.config import get_settings
from app.models.event import Event
from app.models.prediction import Prediction

settings = get_settings()
engine = create_async_engine(settings.DATABASE_URL)
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def diagnose():
    async with async_session() as db:
        # 1. Total events
        total_events = await db.execute(select(func.count(Event.id)))
        print(f"\n[1] Total events in DB: {total_events.scalar()}")

        # 2. Events in last 30 days
        events_30d = await db.execute(
            select(func.count(Event.id)).where(
                Event.detected_at >= text("NOW() - INTERVAL '30 days'")
            )
        )
        print(f"[2] Events in last 30 days: {events_30d.scalar()}")

        # 3. Unique (event_type, location) pairs in last 30 days
        unique_pairs = await db.execute(
            select(Event.event_type, Event.location, func.count(Event.id).label("cnt"))
            .where(Event.detected_at >= text("NOW() - INTERVAL '30 days'"))
            .where(Event.event_type != "unknown")
            .where(Event.location != "unknown")
            .group_by(Event.event_type, Event.location)
            .order_by(func.count(Event.id).desc())
            .limit(20)
        )
        rows = unique_pairs.all()
        print(f"\n[3] Top unique (event_type, location) pairs ({len(rows)} shown):")
        for row in rows:
            print(f"    {row.event_type} | {row.location} | count={row.cnt}")

        # 4. How many predictions exist now
        pred_count = await db.execute(select(func.count(Prediction.id)))
        print(f"\n[4] Current predictions in DB: {pred_count.scalar()}")

        # 5. Events with filtered-out types
        filtered = await db.execute(
            select(func.count(Event.id)).where(
                (Event.event_type == "unknown") | 
                (Event.event_type == "noise") | 
                (Event.location == "unknown")
            )
        )
        print(f"[5] Events filtered out (unknown/noise): {filtered.scalar()}")

        # 6. Breakdown of event types
        event_type_dist = await db.execute(
            select(Event.event_type, func.count(Event.id).label("cnt"))
            .group_by(Event.event_type)
            .order_by(func.count(Event.id).desc())
        )
        print(f"\n[6] Event type distribution:")
        for row in event_type_dist.all():
            print(f"    {row.event_type}: {row.cnt}")


if __name__ == "__main__":
    asyncio.run(diagnose())
