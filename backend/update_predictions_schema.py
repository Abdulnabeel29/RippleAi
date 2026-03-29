import os
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import dotenv

dotenv.load_dotenv()

async def update_prediction_schema():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env")
        return

    print(f"Connecting to: {database_url[:30]}...")
    engine = create_async_engine(database_url)

    async with engine.connect() as conn:
        print("\n--- UPDATING PREDICTIONS SCHEMA ---")
        
        # List of columns to check/add
        columns_to_add = {
            "why": "TEXT",
            "how": "TEXT",
            "strategic_brief": "TEXT"
        }
        
        for col, col_type in columns_to_add.items():
            check_query = text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='predictions' AND column_name='{col}';
            """)
            result = await conn.execute(check_query)
            exists = result.scalar()
            
            if not exists:
                print(f"Adding '{col}' column to 'predictions' table...")
                await conn.execute(text(f"ALTER TABLE predictions ADD COLUMN {col} {col_type};"))
                print(f"Column '{col}' added successfully.")
            else:
                print(f"Column '{col}' already exists.")
            
        await conn.commit()
        print("\nPrediction schema update complete.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update_prediction_schema())
