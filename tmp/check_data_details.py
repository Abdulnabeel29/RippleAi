import asyncio
import aiosqlite
import os
import json

async def check_db_data():
    db_path = 'backend/supply_chain.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} does not exist.")
        return

    async with aiosqlite.connect(db_path) as db:
        # Check first 5 news articles
        async with db.execute('SELECT id, title, ingested_at FROM news_articles LIMIT 5') as cursor:
            articles = await cursor.fetchall()
            print(f"Sample News Articles (Count: {len(articles)}):")
            for article in articles:
                print(f"  ID: {article[0]}, Title: {article[1][:50]}..., Ingested: {article[2]}")

        # Check first 5 events
        async with db.execute('SELECT id, event_type, location, industry, severity, confidence_score FROM events LIMIT 5') as cursor:
            events = await cursor.fetchall()
            print(f"\nSample Events (Count: {len(events)}):")
            for event in events:
                print(f"  ID: {event[0]}, Type: {event[1]}, Location: {event[2]}, Industry: {event[3]}, Severity: {event[4]}, Confidence: {event[5]}")

if __name__ == "__main__":
    asyncio.run(check_db_data())
