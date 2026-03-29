import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import dotenv

dotenv.load_dotenv()

async def update_schema():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    print(f"Connecting to: {database_url[:30]}...")
    engine = create_async_engine(database_url)

    async with engine.connect() as conn:
        print("\n--- UPDATING SUPABASE SCHEMA ---")
        
        # Check if simulation_results exists
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='events' AND column_name='simulation_results';
        """)
        result = await conn.execute(check_query)
        exists = result.scalar()
        
        if not exists:
            print("Adding 'simulation_results' column to 'events' table...")
            await conn.execute(text("ALTER TABLE events ADD COLUMN simulation_results TEXT;"))
            print("Column added successfully.")
        else:
            print("Column 'simulation_results' already exists.")
            
        await conn.commit()
        print("\nSchema update complete.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update_schema())
