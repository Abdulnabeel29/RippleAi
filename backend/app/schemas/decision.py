import json
from pydantic import BaseModel, Field

class TimeBasedImpact(BaseModel):
    immediate: str = Field(..., description="Impact expected within 0-3 days")
    short_term: str = Field(..., description="Impact expected within 3-7 days")
    medium_term: str = Field(..., description="Impact expected within 7-14 days")

class ImpactAnalysis(BaseModel):
    affected_industries: list[str] = Field(..., description="List of industries explicitly affected")
    estimated_delay_timeline: str = Field(..., description="String summarizing the expected delay")
    severity_explanation: str = Field(..., description="Explanation of why this severity level was assigned")

class ActionRecommendation(BaseModel):
    strategy: str = Field(..., description="High level mitigation strategy name")
    operational_suggestion: str = Field(..., description="Concrete operational step to execute")

class DecisionIntelligenceResponse(BaseModel):
    narrative_explanation: str = Field(..., description="Human-readable story explaining how the disruption spreads step-by-step")
    impact_analysis: ImpactAnalysis
    time_based_impact: TimeBasedImpact
    action_recommendations: list[ActionRecommendation]

    def to_json_string(self) -> str:
        return self.model_dump_json()
