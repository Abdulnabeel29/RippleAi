import asyncio
import httpx
import sqlite3
import uuid
import json
from datetime import datetime

from app.services.graph_service import graph_service

async def test_api():
    await graph_service.connect()

    event_id = str(uuid.uuid4())
    print(f"Testing Simulation Endpoint with new Event ID: {event_id}")

    # 1. Insert into SQLite for API DB lookup
    conn = sqlite3.connect('supply_chain.db')
    c = conn.cursor()
    c.execute(
        'INSERT INTO news_articles (id, title, url, ingested_at) VALUES (?, ?, ?, ?)',
        (event_id, "Major Chip Shortage", f"mock://{event_id}", datetime.utcnow())
    )
    c.execute(
        'INSERT INTO events (id, event_type, location, severity, source_article_id, detected_at, status, industry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        (event_id, "shortage", "Taiwan", "high", event_id, datetime.utcnow(), "active", "Electronics")
    )
    conn.commit()
    conn.close()

    # 2. Insert into Neo4j
    await graph_service.insert_event_to_graph(
        event_id=event_id,
        industry="Electronics",
        location="Taiwan",
        severity="high",
        event_type="shortage"
    )

    # 3. Request the simulation from the API
    url = f"http://localhost:8000/events/{event_id}/simulation"
    print(f"\nRequesting {url}...")
    
    async with httpx.AsyncClient() as client:
        res =  await client.get(url)
        print(f"Status: {res.status_code}")
        try:
            data = res.json()
            print(json.dumps(data.get("data", {}).get("impacts", []), indent=2))
        except Exception as e:
            print("Failed to decode JSON:", str(e), res.text)
            
    await graph_service.close()

if __name__ == "__main__":
    asyncio.run(test_api())
