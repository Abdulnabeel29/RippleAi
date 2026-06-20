import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.core.config import get_settings

settings = get_settings()
engine = create_async_engine(settings.DATABASE_URL, echo=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)

async def clear():
    async with async_session() as db:
        await db.execute(text('UPDATE events SET simulation_results = NULL'))
        await db.commit()
        print("Cleared simulation results.")

if __name__ == "__main__":
    asyncio.run(clear())
