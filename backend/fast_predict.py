import asyncio
import os
from datetime import datetime, timedelta, timezone

import dotenv
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.event import Event
from app.models.prediction import Prediction
from app.core.config import get_settings
from app.services.prediction_service import _get_base_delay

dotenv.load_dotenv()

async def fast_predict():
    print("Starting fast prediction generation without AI enrichment...")
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=30)
    if settings.DATABASE_URL.startswith("sqlite"):
        window_start = window_start.replace(tzinfo=None)
        now_compare = now.replace(tzinfo=None)
    else:
        now_compare = now

    async with async_session() as db:
        query = select(Event).where(Event.detected_at >= window_start)
        result = await db.execute(query)
        events = result.scalars().all()

        if not events:
            print("No events found in 30 days.")
            return

        topology_weights = {}
        for event in events:
            ev_type = (event.event_type or "").lower().strip()
            loc = (event.location or "").lower().strip()
            
            if loc == "unknown" or ev_type in ["unknown", "noise", ""]:
                continue
                
            key = (ev_type, loc)
            
            evt_detected_at = event.detected_at
            if evt_detected_at.tzinfo is None and now_compare.tzinfo is not None:
                evt_detected_at = evt_detected_at.replace(tzinfo=timezone.utc)
            elif evt_detected_at.tzinfo is not None and now_compare.tzinfo is None:
                evt_detected_at = evt_detected_at.replace(tzinfo=None)

            days_since = (now_compare - evt_detected_at).total_seconds() / (24 * 3600)
            days_since = max(0.0, days_since)
            weight = 1.0 / (1.0 + days_since)
            
            if key not in topology_weights:
                topology_weights[key] = {
                    "weight_sum": 0.0,
                    "event_type": event.event_type,
                    "location": event.location,
                    "max_severity": event.severity
                }
            
            topology_weights[key]["weight_sum"] += weight

        await db.execute(delete(Prediction))

        count = 0
        for key, data in topology_weights.items():
            probability = 1.0 - (1.0 / (1.0 + data["weight_sum"]))
            
            if probability >= 0.7:
                risk_level = "High"
            elif probability >= 0.4:
                risk_level = "Medium"
            else:
                risk_level = "Low"
                
            base_delay = _get_base_delay(data["event_type"])
            expected_delay_days = max(1, int(base_delay * probability) + 1)

            db.add(Prediction(
                event_type=data["event_type"],
                location=data["location"],
                probability=round(probability, 3),
                expected_delay_days=expected_delay_days,
                risk_level=risk_level,
                explanation="AI Enrichment bypassed to avoid rate limits.",
                why="Strategic factor analysis pending...",
                how="Operational propagation delta pending...",
                strategic_brief=None
            ))
            count += 1
        
        await db.commit()
        print(f"Successfully generated {count} predictions.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fast_predict())
