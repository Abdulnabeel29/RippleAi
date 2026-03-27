import asyncio
import aiosqlite
import os

async def check_db():
    db_path = 'backend/supply_chain.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} does not exist.")
        return

    async with aiosqlite.connect(db_path) as db:
        async with db.execute('SELECT COUNT(*) FROM news_articles') as cursor:
            articles = await cursor.fetchone()
            print(f"News Articles: {articles[0]}")

        async with db.execute('SELECT COUNT(*) FROM events') as cursor:
            events = await cursor.fetchone()
            print(f"Events: {events[0]}")

if __name__ == "__main__":
    asyncio.run(check_db())
