import asyncio
import uuid
import sqlite3
import httpx
import json
from datetime import datetime

def inject_db():
    print("Injecting mock historical events into SQLite...")
    conn = sqlite3.connect('supply_chain.db')
    c = conn.cursor()
    
    # We will inject 3 "Taiwan factory_fire" events to boost probability,
    # 2 "Rotterdam strike" events, and 1 "Suez Canal blockage" event.
    
    mock_data = [
        ("factory_fire", "Taiwan", "Electronics", 3),
        ("strike", "Rotterdam", "Shipping", 2),
        ("blockage", "Suez Canal", "Shipping", 1),
    ]
    
    for type_name, loc, ind, count in mock_data:
        for _ in range(count):
            e_id = str(uuid.uuid4())
            c.execute('INSERT INTO news_articles (id, title, url, ingested_at) VALUES (?, ?, ?, ?)', 
                      (e_id, "Mock Title", f"mock://{e_id}", datetime.utcnow()))
            c.execute('INSERT INTO events (id, event_type, location, severity, source_article_id, detected_at, status, industry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                      (e_id, type_name, loc, "critical", e_id, datetime.utcnow(), "resolved", ind))
            
    conn.commit()
    conn.close()
    print("Injection complete.")

async def test_api():
    url = "http://localhost:8000/predictions"
    print(f"\nRequesting {url}...")
    async with httpx.AsyncClient() as client:
        res = await client.get(url, timeout=10.0)
        print(f"Status: {res.status_code}")
        print(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    inject_db()
    asyncio.run(test_api())
