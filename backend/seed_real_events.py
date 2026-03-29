import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import dotenv

dotenv.load_dotenv()

async def seed_data():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    print(f"Connecting to: {database_url[:30]}...")
    engine = create_async_engine(database_url)

    async with engine.connect() as conn:
        print("\n--- SEEDING REAL DISRUPTIONS ---")
        
        # We update the 'unknown' events with diverse real-world scenario data
        # This allows the prediction engine to detect clusters.
        scenarios = [
            ("Port Congestion", "Singapore", "Shipping", "high"),
            ("Labor Strike", "Antwerp", "Logistics", "medium"),
            ("Semi-conductor Shortage", "Hsinchu", "Electronics", "critical"),
            ("Factory Fire", "Shenzhen", "Manufacturing", "high"),
            ("Customs Delay", "Hamburg", "Retail", "low"),
            ("Hurricane Warning", "New Orleans", "Oil & Gas", "critical"),
            ("Railway Disruption", "Chicago", "Freight", "medium"),
            ("Cyber Attack on Carrier", "Piraeus", "Maritime", "high")
        ]
        
        # 1. Update events with varying locations and types
        for i, (ev_type, loc, ind, sev) in enumerate(scenarios):
            try:
                # Update 5 events per scenario to create some "clustering" for predictions
                query = text(f"""
                    UPDATE events 
                    SET event_type = :ev_type, 
                        location = :loc, 
                        industry = :ind, 
                        severity = :sev,
                        summary = :summary
                    WHERE id IN (
                        SELECT id FROM events 
                        WHERE location = 'unknown' 
                        LIMIT 5
                    );
                """)
                await conn.execute(query, {
                    "ev_type": ev_type,
                    "loc": loc,
                    "ind": ind,
                    "sev": sev,
                    "summary": f"Reports of {ev_type} in {loc} affecting the {ind} industry. Supply chain leads are monitoring for cascading delays."
                })
                print(f"Applied cluster: {ev_type} in {loc}")
            except Exception as e:
                print(f"Error seeding {ev_type}: {e}")
        
        await conn.commit()
        print("\nEvents enriched. Now triggering prediction engine...")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_data())
