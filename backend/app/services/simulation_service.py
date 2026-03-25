"""
Ripple Effect Simulation Service.

Simulates supply chain disruptions cascading through the Neo4j graph, 
calculating compounded impact scores with mathematical decay logic.
"""

import logging
from typing import Any, Dict, List
from collections import defaultdict

from app.services.graph_service import graph_service

logger = logging.getLogger(__name__)


class SimulationService:
    """
    Simulation Engine for calculating graph impact topologies.
    """

    def __init__(self) -> None:
        # Depth decay parameters
        # Depth 1: Industry
        # Depth 2: Directly Affected Companies
        # Depth 3: Downstream / Cascading Companies
        self.decay_rates = {
            1: 1.0,
            2: 0.6,
            3: 0.36
        }

    def _combine_probabilities(self, scores: List[float]) -> float:
        """
        Combines multiple impact paths into a single normalized score [0.0, 1.0].
        Standard probabilistic combination: 1 - product((1-s) for s in scores)
        """
        if not scores:
            return 0.0
        complement_product = 1.0
        for s in scores:
            # Bound input safely
            s_bounded = max(0.0, min(1.0, s))
            complement_product *= (1.0 - s_bounded)
            
        combined = 1.0 - complement_product
        return round(combined, 4)

    async def simulate_impact(self, event_id: str) -> List[Dict[str, Any]]:
        """
        Traverses the target event's dependency graph up to Depth 3,
        assigning and aggregating simulated impact scores.

        Args:
            event_id: The UUID/str of the disruption event.

        Returns:
            List of impact dictionaries containing entity name, score, and depth.
        """
        # Dictionary structure: { "EntityName": { "depths": [1, 2], "scores": [1.0, 0.6] } }
        entity_tracker: Dict[str, Dict[str, List[Any]]] = defaultdict(
            lambda: {"depths": [], "scores": []}
        )

        query = """
        MATCH (e:Event {id: $event_id})-[:AFFECTS]->(i:Industry)
        OPTIONAL MATCH (c:Company)-[:BELONGS_TO]->(i)
        OPTIONAL MATCH (c)-[:SUPPLIES_TO]->(downstream:Company)
        RETURN i.name AS depth_1_industry, 
               c.name AS depth_2_company, 
               downstream.name AS depth_3_company
        """
        
        try:
            if graph_service.driver is not None:
                async with graph_service.driver.session() as session:
                    result = await session.run(query, event_id=event_id)
                    records = await result.data()

                    for record in records:
                        # Depth 1 (Industry Level)
                        d1_entity = record.get("depth_1_industry")
                        if d1_entity:
                            entity_tracker[d1_entity]["depths"].append(1)
                            entity_tracker[d1_entity]["scores"].append(self.decay_rates[1])

                        # Depth 2 (Direct Company Level)
                        d2_entity = record.get("depth_2_company")
                        if d2_entity:
                            entity_tracker[d2_entity]["depths"].append(2)
                            entity_tracker[d2_entity]["scores"].append(self.decay_rates[2])

                        # Depth 3 (Downstream Supplier Level)
                        d3_entity = record.get("depth_3_company")
                        if d3_entity:
                            entity_tracker[d3_entity]["depths"].append(3)
                            entity_tracker[d3_entity]["scores"].append(self.decay_rates[3])
                            
                    logger.info("Simulation traversed %d distinct topology paths for event_id: %s", len(records), event_id)

        except Exception as e:
            logger.exception("Simulation graph traversal failed for %s: %s", event_id, str(e))
            raise RuntimeError("Simulation graph traversal failed") from e

        # Process and normalize the structural data
        impacts: List[Dict[str, Any]] = []
        conflicts = 0
        for entity_name, data in entity_tracker.items():
            if len(data["scores"]) > 1:
                conflicts += 1
                
            combined_score = self._combine_probabilities(data["scores"])
            # Track the most critical (i.e. lowest) depth it was accessed by
            primary_depth = min(data["depths"]) 
            
            # Classification Logic
            impact_level = "Low"
            if combined_score >= 0.7:
                impact_level = "High"
            elif combined_score >= 0.4:
                impact_level = "Medium"
            
            impacts.append({
                "entity": entity_name,
                "impact_score": combined_score,
                "impact_level": impact_level,
                "depth": primary_depth
            })

        # Sort by highest impact first
        impacts.sort(key=lambda x: x["impact_score"], reverse=True)
        
        logger.info(
            "Simulation completed for event_id: %s | Impacted Entities: %d | Path Aggregations (Conflicts): %d", 
            event_id, len(impacts), conflicts
        )
        return impacts


# Singleton instance
simulation_service = SimulationService()
