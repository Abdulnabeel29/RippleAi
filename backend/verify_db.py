import asyncio
import os
import dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

dotenv.load_dotenv()

async def main():
    db_url = os.getenv("DATABASE_URL")
    print(f"Checking DB: {db_url}")
    engine = create_async_engine(db_url)
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT count(*) FROM news_articles"))
        print(f"News articles count: {res.scalar()}")
        res = await conn.execute(text("SELECT count(*) FROM events"))
        print(f"Events count: {res.scalar()}")
        res = await conn.execute(text("SELECT count(*) FROM predictions"))
        print(f"Predictions count: {res.scalar()}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
