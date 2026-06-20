"""
Standalone script to manually trigger the prediction engine.
Runs update_predictions() directly against the database.
"""
import asyncio
import sys, os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import get_settings
from app.services.prediction_service import prediction_service

settings = get_settings()
engine = create_async_engine(settings.DATABASE_URL)
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def run():
    print("Running prediction engine...")
    async with async_session() as db:
        await prediction_service.update_predictions(db)
    print("Done! Checking prediction count...")

    from sqlalchemy import select, func
    from app.models.prediction import Prediction
    async with async_session() as db:
        count = await db.execute(select(func.count(Prediction.id)))
        n = count.scalar()
        print(f"Predictions in DB: {n}")

        result = await db.execute(
            select(Prediction).order_by(Prediction.probability.desc())
        )
        preds = result.scalars().all()
        for p in preds:
            print(f"  [{p.risk_level:6}] {p.event_type:30} | {p.location:25} | prob={p.probability:.3f}")


if __name__ == "__main__":
    asyncio.run(run())
