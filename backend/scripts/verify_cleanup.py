import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, or_
from app.core.database import async_session_factory
from app.models.event import Event
from app.models.news_article import NewsArticle

async def verify_cleanup():
    async with async_session_factory() as session:
        stmt = select(Event).where(
            or_(
                Event.summary == None,
                Event.confidence_score == None
            )
        )
        result = await session.execute(stmt)
        events = result.scalars().all()
        print(f"Remaining legacy events: {len(events)}")
        
        if len(events) > 0:
            for e in events:
                print(f"ID: {e.id}, Summary: {e.summary}, Score: {e.confidence_score}")

if __name__ == "__main__":
    asyncio.run(verify_cleanup())
