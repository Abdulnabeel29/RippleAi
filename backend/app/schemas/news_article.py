"""
Pydantic schemas for news article serialization.

Used to validate and serialize news article data for API responses.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, HttpUrl


class NewsArticleResponse(BaseModel):
    """
    Schema for serializing a news article in API responses.

    Attributes:
        id: Unique article identifier.
        title: Article headline.
        description: Short description text.
        source: Name of the publishing source.
        author: Article author name.
        url: Canonical URL of the article.
        published_at: Original publication timestamp.
        ingested_at: Timestamp when stored in the system.
    """

    id: str
    title: str
    description: Optional[str] = None
    source: Optional[str] = None
    author: Optional[str] = None
    url: str
    published_at: Optional[datetime] = None
    ingested_at: datetime

    model_config = {"from_attributes": True}


class NewsArticleCreate(BaseModel):
    """
    Internal schema for creating a new news article record.

    Attributes:
        title: Article headline.
        description: Short description text.
        content: Full article body.
        source: Name of the publishing source.
        author: Article author name.
        url: Canonical URL (used for deduplication).
        published_at: Original publication timestamp.
        raw_json: Original API payload preserved for reference.
    """

    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    source: Optional[str] = None
    author: Optional[str] = None
    url: HttpUrl
    published_at: Optional[datetime] = None
    raw_json: Optional[dict[str, Any]] = None
