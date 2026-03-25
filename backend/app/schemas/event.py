"""
Pydantic schemas for event data.

Covers AI detection output validation, API response serialization,
and query filter parameters.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EventDetectionResult(BaseModel):
    """
    Validates the structured output from the OpenAI event detection model.

    All AI responses are parsed into this schema before storage.
    Invalid responses that fail validation are discarded.

    Attributes:
        event_type: Category of disruption (e.g. port_closure, strike).
        location: Geographic location affected.
        country: Country of the affected location.
        industry: Industry sector impacted.
        severity: Impact level — must be one of: low, medium, high, critical.
        confidence_score: Model confidence (0.0–1.0).
        summary: Brief human-readable event description.
    """

    event_type: str = Field(..., min_length=1, max_length=100)
    location: str = Field(..., min_length=1, max_length=255)
    country: Optional[str] = Field(None, max_length=100)
    industry: str = Field(..., min_length=1, max_length=100)
    severity: str = Field(..., pattern=r"^(low|medium|high|critical)$")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    summary: str = Field(..., min_length=1)


class EventResponse(BaseModel):
    """
    Schema for serializing an event in API responses.

    Attributes:
        id: Unique event identifier.
        event_type: Disruption category.
        location: Affected location.
        country: Affected country.
        industry: Impacted industry.
        severity: Impact level.
        confidence_score: AI confidence score.
        summary: Human-readable event description.
        source_article_id: FK to the originating news article.
        detected_at: Timestamp of AI detection.
        status: Event lifecycle status.
    """

    id: str
    event_type: str
    location: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    severity: str
    confidence_score: Optional[float] = None
    summary: Optional[str] = None
    source_article_id: Optional[str] = None
    detected_at: datetime
    status: str

    model_config = {"from_attributes": True}


class EventFilterParams(BaseModel):
    """
    Query parameters for filtering events.

    Attributes:
        industry: Filter by industry name (case-insensitive).
        severity: Filter by severity level.
        location: Filter by location (case-insensitive partial match).
        status: Filter by event lifecycle status.
        limit: Maximum number of results to return.
        offset: Number of results to skip for pagination.
    """

    industry: Optional[str] = None
    severity: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


class EventImpactResponse(BaseModel):
    """
    Schema for serializing an event alongside its graph-derived impact.
    """

    event: EventResponse
    impact: dict[str, list[str]]


class SimulationImpactItem(BaseModel):
    """
    Schema for individual entity impact from a simulation.
    """
    entity: str
    impact_score: float = Field(ge=0.0, le=1.0)
    impact_level: str
    depth: int = Field(ge=1, le=3)


class EventSimulationResponse(BaseModel):
    """
    Schema for full Ripple Simulation response.
    """
    event: EventResponse
    impacts: list[SimulationImpactItem]
