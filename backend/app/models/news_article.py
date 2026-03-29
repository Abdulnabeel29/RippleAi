"""
SQLAlchemy model for the news_articles table.

Stores raw news articles fetched from external APIs.
Each article is uniquely identified by its URL to prevent duplicates.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID, JSON

from app.models.base import Base


def generate_uuid() -> str:
    """Generates a UUID4 string for use as primary key."""
    return str(uuid.uuid4())


class NewsArticle(Base):
    """
    Represents a raw news article ingested from an external source.

    Attributes:
        id: Unique identifier (UUID string).
        title: Headline of the article.
        description: Short description or subtitle.
        content: Full article text body.
        source: Name of the news source.
        author: Article author name.
        url: Canonical URL of the article (unique constraint).
        published_at: Original publication timestamp.
        ingested_at: Timestamp when the article was stored.
        language: ISO language code of the article.
        raw_json: Original JSON payload from the API.
    """

    __tablename__ = "news_articles"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    source = Column(String(255), nullable=True)
    author = Column(String(255), nullable=True)
    url = Column(Text, unique=True, nullable=False, index=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    ingested_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    language = Column(String(10), nullable=True)
    raw_json = Column(JSON, nullable=True)
    embedding = Column(JSON, nullable=True)  # Stores vector embedding as JSON list

    def __repr__(self) -> str:
        return f"<NewsArticle(id={self.id}, title='{self.title[:50]}...')>"
