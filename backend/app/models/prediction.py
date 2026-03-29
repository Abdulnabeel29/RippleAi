"""
Prediction SQLAlchemy Model.

Stores the generated future risk forecasts and probability scores
so the API can serve them immediately without waiting for LLM calculations.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base

class Prediction(Base):
    """
    Database model representing a future supply chain disruption prediction.
    """
    __tablename__ = "predictions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
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
