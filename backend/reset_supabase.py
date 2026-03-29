import asyncio
import os
import dotenv
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import create_async_engine

dotenv.load_dotenv()

class Base(DeclarativeBase):
    pass

class NewsArticle(Base):
    __tablename__ = "news_articles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    source = Column(String(255), nullable=True)
    author = Column(String(255), nullable=True)
    url = Column(Text, unique=True, nullable=False, index=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    ingested_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    language = Column(String(10), nullable=True)
    raw_json = Column(JSON, nullable=True)
    embedding = Column(JSON, nullable=True)

class Event(Base):
    __tablename__ = "events"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(100), nullable=False, index=True)
    location = Column(String(255), nullable=True, index=True)
    country = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True, index=True)
    severity = Column(String(50), nullable=False, index=True)
    confidence_score = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    strategic_brief = Column(Text, nullable=True)
    source_article_id = Column(UUID(as_uuid=True), ForeignKey("news_articles.id", ondelete="SET NULL"), nullable=True)
    detected_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    event_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, default="active")

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(100), nullable=False, index=True)
    location = Column(String(255), nullable=False, index=True)
    probability = Column(Float, nullable=False)
    expected_delay_days = Column(Integer, nullable=False)
    risk_level = Column(String(50), nullable=False)
    explanation = Column(Text, nullable=False)
    why = Column(Text, nullable=True)
    how = Column(Text, nullable=True)
    strategic_brief = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

from sqlalchemy import Integer

async def main():
    db_url = os.getenv("DATABASE_URL")
    engine = create_async_engine(db_url)
    print("Resetting Supabase schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Supabase schema reset and initialized successfully.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
