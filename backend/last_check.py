import asyncio
import os
import sys
import dotenv
import requests

# Add current dir to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

dotenv.load_dotenv()

async def verify_apis():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found.")
        return

    print(f"Connecting to: {db_url[:30]}...")
    engine = create_async_engine(db_url)

    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT id FROM events LIMIT 1"))
        row = res.first()
        if not row:
            print("No events found in database.")
            return
        
        event_id = str(row[0])
        print(f"Testing live Event ID: {event_id}")

        # Test Impact
        url_impact = f"http://localhost:8000/events/{event_id}/impact"
        print(f"GET {url_impact}")
        r1 = requests.get(url_impact)
        print(f"Status: {r1.status_code}")
        if r1.status_code != 200:
            print(f"BODY: {r1.text}")

        # Test Simulation
        url_sim = f"http://localhost:8000/events/{event_id}/simulation"
        print(f"GET {url_sim}")
        r2 = requests.get(url_sim)
        print(f"Status: {r2.status_code}")
        if r2.status_code != 200:
            print(f"BODY: {r2.text}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verify_apis())
