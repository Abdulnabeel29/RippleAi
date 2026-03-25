import asyncio
import uuid
import sqlite3
import httpx
import json
import sys
import os
from datetime import datetime, timedelta

# Add project root to path for backfill import
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))
from backfill_embeddings import backfill

def inject_time_decay_data():
    print("Injecting timed mock events into SQLite...")
    conn = sqlite3.connect('supply_chain.db')
    c = conn.cursor()
    
    # 3 categories with different temporal distributions:
    # 1. Taiwan Factory Fire: 1 today, 1 yesterday, 1 two days ago (Frequent and Recent)
    # 2. Rotterdam Strike: 5 events, but 40 days ago (Out of window)
    # 3. Suez Canal Blockage: 1 event, 15 days ago (Lone recent-ish event)
    
    now = datetime.utcnow()
    
    mock_events = [
        # Taiwan: high frequency and very recent
        ("factory_fire", "Taiwan", "Electronics", now),
        ("factory_fire", "Taiwan", "Electronics", now - timedelta(days=1)),
        ("factory_fire", "Taiwan", "Electronics", now - timedelta(days=2)),
        
        # Rotterdam: high frequency but old (should be ignored)
        ("strike", "Rotterdam", "Shipping", now - timedelta(days=40)),
        ("strike", "Rotterdam", "Shipping", now - timedelta(days=41)),
        ("strike", "Rotterdam", "Shipping", now - timedelta(days=42)),
        
        # Suez: low frequency but within window
        ("blockage", "Suez Canal", "Shipping", now - timedelta(days=15)),
    ]
    
    # Clear existing events to ensure clean test
    c.execute('DELETE FROM events')
    c.execute('DELETE FROM news_articles')
    
    for type_name, loc, ind, ts in mock_events:
        e_id = str(uuid.uuid4())
        c.execute('INSERT INTO news_articles (id, title, url, ingested_at) VALUES (?, ?, ?, ?)', 
                  (e_id, f"Mock Event {type_name}", f"mock://{e_id}", ts))
        c.execute('INSERT INTO events (id, event_type, location, severity, source_article_id, detected_at, status, industry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                  (e_id, type_name, loc, "critical", e_id, ts, "resolved", ind))
            
    conn.commit()
    conn.close()
    print("Time-decay injection complete.")

async def test_predictions_decay():
    url = "http://localhost:8000/predictions"
    print(f"\nRequesting {url}...")
    async with httpx.AsyncClient() as client:
        res = await client.get(url, timeout=60.0)
        print(f"Status: {res.status_code}")
        data = res.json()
        print(json.dumps(data, indent=2))
        
        predictions = data.get("predictions", [])
        
        # Rotterdam should NOT be in the response
        locations = [p["location"] for p in predictions]
        if "Rotterdam" in locations:
            print("FAIL: Rotterdam (old events) found in predictions!")
        else:
            print("PASS: Rotterdam excluded (older than 30 days).")
            
        # Taiwan should be the highest probability
        if len(predictions) > 0 and predictions[0]["location"] == "Taiwan":
            print("PASS: Taiwan (recent frequent) has highest probability.")
        else:
            print("FAIL: Taiwan not top prediction.")

if __name__ == "__main__":
    inject_time_decay_data()
    # Ensure RAG embeddings are generated for the injected mock data
    print("Running temporary backfill for mock data...")
    asyncio.run(backfill())
    
    asyncio.run(test_predictions_decay())
