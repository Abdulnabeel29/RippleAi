import asyncio
import aiosqlite
import os

async def audit_data_quality():
    db_path = 'backend/supply_chain.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} does not exist.")
        return

    async with aiosqlite.connect(db_path) as db:
        async with db.execute('SELECT COUNT(*) FROM events') as cursor:
            total = (await cursor.fetchone())[0]
            print(f"Total Events: {total}")

        async with db.execute('SELECT COUNT(*) FROM events WHERE location IS NOT NULL AND location != ""') as cursor:
            has_location = (await cursor.fetchone())[0]
            print(f"Events with Location: {has_location}")

        async with db.execute('SELECT COUNT(*) FROM events WHERE severity IS NOT NULL AND severity != ""') as cursor:
            has_severity = (await cursor.fetchone())[0]
            print(f"Events with Severity: {has_severity}")

        async with db.execute('SELECT COUNT(*) FROM events WHERE location IS NOT NULL AND location != "" AND severity IS NOT NULL AND severity != ""') as cursor:
            both = (await cursor.fetchone())[0]
            print(f"Events passing filter (location & severity): {both}")
            
        if both == 0:
            print("\nSample of missing data:")
            async with db.execute('SELECT id, event_type, location, severity FROM events LIMIT 5') as cursor:
                rows = await cursor.fetchall()
                for row in rows:
                    print(f"  ID: {row[0]}, Type: {row[1]}, Location: {row[2]}, Severity: {row[3]}")

if __name__ == "__main__":
    asyncio.run(audit_data_quality())
