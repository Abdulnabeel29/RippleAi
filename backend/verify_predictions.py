import os
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import dotenv

dotenv.load_dotenv()

from app.models.prediction import Prediction

async def verify_predictions():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("\n--- VERIFYING PREDICTIONS PERSISTENCE ---")
        query = select(Prediction).limit(5)
        result = await session.execute(query)
        predictions = result.scalars().all()
        
        if not predictions:
            print("No predictions found in database.")
            return

        for p in predictions:
            print(f"\nID: {p.id}")
            print(f"Event: {p.event_type} in {p.location}")
            print(f"Why: {p.why[:60]}..." if p.why else "Why: MISSING")
            print(f"How: {p.how[:60]}..." if p.how else "How: MISSING")
            has_brief = "YES" if p.strategic_brief else "NO"
            print(f"Strategic Brief: {has_brief}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify_predictions())
