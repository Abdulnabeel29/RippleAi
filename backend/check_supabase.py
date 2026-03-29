import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import dotenv

dotenv.load_dotenv()

async def check_supabase():
    db_url = os.getenv("DATABASE_URL")
    print(f"Connecting to: {db_url}")
    engine = create_async_engine(db_url)
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
            tables = [row[0] for row in result]
            print(f"Tables found: {tables}")
    except Exception as e:
        print(f"Error connecting: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_supabase())
