import asyncio
import os
import uuid
import dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text, Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase

dotenv.load_dotenv()

class Base(DeclarativeBase):
    pass

class TestTable(Base):
    __tablename__ = "test_table"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50))

async def main():
    db_url = os.getenv("DATABASE_URL")
    print(f"Testing write to: {db_url.split('@')[-1]}")
    engine = create_async_engine(db_url, echo=True)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        test = TestTable(name="Supabase Migration Test")
        session.add(test)
        await session.commit()
        print("Commited test row.")
        
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT name FROM test_table"))
        print(f"Result: {res.all()}")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
