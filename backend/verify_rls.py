import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import dotenv

dotenv.load_dotenv()

async def check_db():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    print(f"Connecting to: {database_url[:30]}...")
    engine = create_async_engine(database_url)

    async with engine.connect() as conn:
        # 1. Check Row Counts
        for table in ["news_articles", "events", "predictions"]:
            try:
                res = await conn.execute(text(f"SELECT count(*) FROM {table}"))
                print(f"Count for {table}: {res.scalar()}")
            except Exception as e:
                print(f"Error checking {table}: {e}")

        # 2. Check RLS Status
        print("\n--- RLS STATUS ---")
        try:
            rls_query = text("""
                SELECT tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename IN ('news_articles', 'events', 'predictions');
            """)
            res = await conn.execute(rls_query)
            for row in res:
                status = "ENABLED" if row[1] else "DISABLED"
                print(f"Table {row[0]}: RLS is {status}")
        except Exception as e:
            print(f"Error checking RLS: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_db())
