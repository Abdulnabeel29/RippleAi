"""
Prediction output schemas.
"""
from pydantic import BaseModel, Field
from typing import List


class PredictionItem(BaseModel):
    """
    Schema for a single forecasted disruption and its risk score.
    """
    event_type: str
    location: str
    probability: float = Field(ge=0.0, le=1.0)
    expected_delay_days: int = Field(ge=0)
    risk_level: str
    explanation: str = Field(default="Reasoning pending...")


class PredictionResponse(BaseModel):
    """
    Root payload format for GET /predictions.
    """
    predictions: List[PredictionItem]
