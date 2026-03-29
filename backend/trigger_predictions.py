import asyncio
import os
import sys
import dotenv

# Add current dir to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.services.prediction_service import prediction_service

dotenv.load_dotenv()

async def run_predictions():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found.")
        return

    print(f"Connecting to: {db_url[:30]}...")
    engine = create_async_engine(db_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Triggering prediction engine update...")
        await prediction_service.update_predictions(session)
        print("Predictions updated successfully.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_predictions())
