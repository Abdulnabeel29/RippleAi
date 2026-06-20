import asyncio
import os
import dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

async def test():
    dotenv.load_dotenv('.env')
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("No DATABASE_URL")
        return
    engine = create_async_engine(db_url)
    async with AsyncSession(engine) as session:
        res1 = await session.execute(text('SELECT count(*) FROM predictions'))
        res2 = await session.execute(text('SELECT count(*) FROM events'))
        print('Predictions:', res1.scalar(), 'Events:', res2.scalar())
    await engine.dispose()

asyncio.run(test())
