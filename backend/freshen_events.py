import asyncio
import os
import random
from datetime import datetime, timedelta, timezone

import dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.event import Event
from app.services.prediction_service import prediction_service
from app.core.config import get_settings

dotenv.load_dotenv()

async def freshen_events_and_repredict():
    print("Starting data freshening...")
    
    settings = get_settings()
    database_url = settings.DATABASE_URL
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    is_sqlite = database_url.startswith("sqlite")
    now = datetime.now(timezone.utc)
    if is_sqlite:
        now = now.replace(tzinfo=None)

    async with async_session() as session:
        # 1. Get all events
        query = select(Event)
        result = await session.execute(query)
        events = result.scalars().all()
        
        if not events:
            print("No events found in the database.")
            return

        print(f"Found {len(events)} events. Freshening timestamps...")
        
        # 2. Update their timestamps to be within the last 1-14 days
        for ev in events:
            days_ago = random.uniform(0.1, 14.0)
            new_time = now - timedelta(days=days_ago)
            ev.detected_at = new_time

        await session.commit()
        print(f"Successfully freshened {len(events)} events.")
        
        # 3. Trigger the prediction engine to recalculate
        print("Regenerating predictions based on freshened events...")
        await prediction_service.update_predictions(session)
        print("Predictions successfully regenerated!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(freshen_events_and_repredict())
