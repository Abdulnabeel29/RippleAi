"""
SQLAlchemy model for the events table.

Stores structured disruption events extracted from news articles
by the AI event detection pipeline.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


def generate_uuid() -> str:
    """Generates a UUID4 string for use as primary key."""
    return str(uuid.uuid4())


class Event(Base):
    """
    Represents a structured supply chain disruption event.

    Attributes:
        id: Unique identifier (UUID string).
        event_type: Category of disruption (e.g. port_closure, strike).
        location: Geographic location affected.
        country: Country of the affected location.
        industry: Industry sector impacted.
        severity: Impact level (low, medium, high, critical).
        confidence_score: AI model's confidence in the extraction (0.0–1.0).
        summary: Human-readable summary of the event.
        source_article_id: FK reference to the originating news article.
        detected_at: Timestamp when the event was detected by AI.
        event_time: Estimated timestamp of when the event occurred.
        status: Lifecycle status (active, resolved, predicted).
    """

    __tablename__ = "events"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    event_type = Column(String(100), nullable=False, index=True)
    location = Column(String(255), nullable=True, index=True)
    country = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True, index=True)
    severity = Column(String(50), nullable=False, index=True)
    confidence_score = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    
    # AI Enrichment: Decision Intelligence and Simulation Narrative
    # 'strategic_brief' stores the JSON narrative, timeline, and actions.
    strategic_brief = Column(Text, nullable=True)
    # 'simulation_results' stores the JSON list of impacted facilities/sectors from ripple simulation.
    simulation_results = Column(Text, nullable=True)
    
    source_article_id = Column(
        UUID(as_uuid=True),
        ForeignKey("news_articles.id", ondelete="SET NULL"),
        nullable=True,
    )
    detected_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    event_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, default="active")

    def __repr__(self) -> str:
        return (
            f"<Event(id={self.id}, type='{self.event_type}', "
            f"severity='{self.severity}')>"
        )
