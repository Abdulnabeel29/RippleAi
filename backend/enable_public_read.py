import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import dotenv

dotenv.load_dotenv()

async def fix_rls():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    print(f"Connecting to: {database_url[:30]}...")
    engine = create_async_engine(database_url)

    async with engine.connect() as conn:
        print("\n--- GRANTING PUBLIC ACCESS ---")
        tables = ["news_articles", "events", "predictions"]
        
        for table in tables:
            try:
                # 1. Enable RLS (just in case)
                await conn.execute(text(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"))
                
                # 2. Drop existing policy if it exists (simplifies script)
                await conn.execute(text(f"DROP POLICY IF EXISTS \"Public Read {table}\" ON {table};"))
                
                # 3. Create Public Read Policy
                await conn.execute(text(f"CREATE POLICY \"Public Read {table}\" ON {table} FOR SELECT USING (true);"))
                
                print(f"Policy 'Public Read {table}' created/updated successfully.")
            except Exception as e:
                print(f"Error updating {table}: {e}")
        
        await conn.commit()

    await engine.dispose()
    print("\nSupabase access policies updated. Dashboard should now have data.")

if __name__ == "__main__":
    asyncio.run(fix_rls())
