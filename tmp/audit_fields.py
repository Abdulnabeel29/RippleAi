import asyncio
import aiosqlite
import os

async def audit_data():
    # Use absolute path for reliability
    db_path = os.path.abspath('backend/supply_chain.db')
    if not os.path.exists(db_path):
        print(f"Error: {db_path} does not exist.")
        return

    async with aiosqlite.connect(db_path) as db:
        async with db.execute('SELECT id, event_type, location, severity FROM events LIMIT 10') as cursor:
            rows = await cursor.fetchall()
            print(f"Audit of first 10 events:")
            for row in rows:
                print(f"  ID: {row[0]}, Type: {row[1]}, Location: '{row[2]}', Severity: '{row[3]}'")

if __name__ == "__main__":
    asyncio.run(audit_data())
