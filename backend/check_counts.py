import asyncio
import os
import dotenv
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.models.event import Event
from app.models.prediction import Prediction
from datetime import datetime, timedelta, timezone

dotenv.load_dotenv()

async def main():
    database_url = os.getenv('DATABASE_URL')
    engine = create_async_engine(database_url)
    async with AsyncSession(engine) as s:
        events = await s.scalar(select(func.count(Event.id)))
        predictions = await s.scalar(select(func.count(Prediction.id)))
        print(f"Total Events in DB: {events}")
        print(f"Total Predictions in DB: {predictions}")
        
        # Check how many events are in the 30-day window
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(days=30)
        
        from app.core.config import get_settings
        settings = get_settings()
        is_sqlite = settings.DATABASE_URL.startswith("sqlite")
        if is_sqlite:
            window_start = window_start.replace(tzinfo=None)
            
        recent_events = await s.scalar(select(func.count(Event.id)).where(Event.detected_at >= window_start))
        print(f"Events in last 30 days: {recent_events}")
        
    await engine.dispose()

asyncio.run(main())
