"""
Predictive Intelligence Service.

Forecasting engine to assign risk probabilities and expected delays
based on statistically analyzing historical disruption events.
"""

import logging
from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timedelta
from app.models.event import Event
from app.schemas.prediction import PredictionItem
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)


def _get_base_delay(event_type: str) -> int:
    """
    Returns baseline recovery delay (in days) according to event type severity.
    """
    type_map = {
        "strike": 14,
        "fire": 30,
        "factory_fire": 30,
        "shortage": 45,
        "weather": 7,
        "hurricane": 21,
        "disruption": 10
    }
    return type_map.get(event_type.lower(), 7)  # Fallback to 7 days


class PredictionService:
    """
    Service for calculating statistical future disruption risks.
    """

    async def generate_predictions(self, db: AsyncSession) -> List[PredictionItem]:
        """
        Scans historical events from the last 30 days, applies time-decay weighting,
        and extracts predictive indicators with normalized probabilities.

        Args:
            db: Async database session.

        Returns:
            List of standardized PredictionItem objects.
        """
        try:
            # 30-day time window
            window_start = datetime.utcnow() - timedelta(days=30)
            
            # Query events within the 30-day window
            query = select(Event).where(Event.detected_at >= window_start)
            result = await db.execute(query)
            events = result.scalars().all()

            if not events:
                return []

            # Aggregate weights by (event_type, location)
            # weight = 1 / (1 + days_since_event)
            now = datetime.utcnow()
            topology_weights = {}
            total_global_weight = 0.0

            for event in events:
                key = (event.event_type.lower(), event.location.lower())
                
                days_since = (now - event.detected_at).total_seconds() / (24 * 3600)
                # Ensure non-negative days_since due to potential clock skew
                days_since = max(0.0, days_since)
                
                weight = 1.0 / (1.0 + days_since)
                
                if key not in topology_weights:
                    topology_weights[key] = {
                        "weight_sum": 0.0,
                        "event_type": event.event_type,
                        "location": event.location,
                        "max_severity": event.severity
                    }
                
                topology_weights[key]["weight_sum"] += weight
                total_global_weight += weight

            predictions: List[PredictionItem] = []
            
            for key, data in topology_weights.items():
                # Normalized Probability across all active predictions
                probability = data["weight_sum"] / total_global_weight if total_global_weight > 0 else 0.0
                
                # Assign dynamic Risk Level string
                if probability >= 0.7:
                    risk_level = "High"
                elif probability >= 0.4:
                    risk_level = "Medium"
                else:
                    risk_level = "Low"
                    
                # Calculate delays based on probability and typical severity
                base_delay = _get_base_delay(data["event_type"])
                expected_delay_days = max(1, int(base_delay * probability) + 1)

                # Generate RAG Explanation
                prediction_dict = {
                    "event_type": data["event_type"],
                    "location": data["location"],
                    "probability": round(probability, 3),
                    "risk_level": risk_level
                }
                explanation = await rag_service.generate_explanation(prediction_dict, db)

                predictions.append(
                    PredictionItem(
                        event_type=data["event_type"],
                        location=data["location"],
                        probability=round(probability, 3),
                        expected_delay_days=expected_delay_days,
                        risk_level=risk_level,
                        explanation=explanation
                    )
                )

            # Sort by highest probability first
            predictions.sort(key=lambda x: x.probability, reverse=True)
            return predictions

        except Exception as e:
            logger.error("Failed to generate time-aware predictions: %s", str(e))
            return []


# Singleton
prediction_service = PredictionService()
