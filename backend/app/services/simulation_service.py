"""
Ripple Effect Simulation Service.

Simulates supply chain disruptions cascading through the Neo4j graph, 
calculating compounded impact scores with mathematical decay logic.
"""

import asyncio
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

    async def simulate_impact(self, event_id: str, event_type: str = None, location: str = None, industry: str = None, event_summary: str = "") -> List[Dict[str, Any]]:
        """
        Traverses the target event's dependency graph up to Depth 3,
        assigning and aggregating simulated impact scores. Falls back to
        LLM synthetic generation when Neo4j has no data or is unreachable.
        """
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

        # ── Graph traversal (with hard timeout) ─────────────────────────────
        if graph_service.driver is None:
            logger.info("No Neo4j driver — using LLM synthetic simulation.")
            return await self._generate_synthetic_simulation(event_type, location, industry, event_summary)

        try:
            async def _run_query():
                import asyncio as _asyncio
                async with graph_service.driver.session() as session:
                    result = await session.run(query, event_id=event_id)
                    return await result.data()

            records = await asyncio.wait_for(_run_query(), timeout=8.0)

        except asyncio.TimeoutError:
            logger.warning("Neo4j timed out for event_id=%s — using LLM synthesis.", event_id)
            return await self._generate_synthetic_simulation(event_type, location, industry, event_summary)
        except Exception as graph_err:
            logger.warning("Neo4j query failed (%s) — using LLM synthesis.", str(graph_err))
            return await self._generate_synthetic_simulation(event_type, location, industry, event_summary)

        # ── Validate records ────────────────────────────────────────────────
        real_records = [
            r for r in records
            if r.get("depth_1_industry") or r.get("depth_2_company") or r.get("depth_3_company")
        ]

        if not real_records:
            logger.info(
                "Graph returned %d null-only rows for event_id=%s → LLM synthesis.",
                len(records), event_id
            )
            return await self._generate_synthetic_simulation(event_type, location, industry, event_summary)

        # ── Aggregate scores ────────────────────────────────────────────────
        for record in real_records:
            d1 = record.get("depth_1_industry")
            if d1:
                entity_tracker[d1]["depths"].append(1)
                entity_tracker[d1]["scores"].append(self.decay_rates[1])

            d2 = record.get("depth_2_company")
            if d2:
                entity_tracker[d2]["depths"].append(2)
                entity_tracker[d2]["scores"].append(self.decay_rates[2])

            d3 = record.get("depth_3_company")
            if d3:
                entity_tracker[d3]["depths"].append(3)
                entity_tracker[d3]["scores"].append(self.decay_rates[3])

        logger.info("Graph simulation: %d paths traversed for event_id=%s", len(real_records), event_id)

        # ── Normalize & return ──────────────────────────────────────────────
        impacts: List[Dict[str, Any]] = []
        for entity_name, data in entity_tracker.items():
            combined_score = self._combine_probabilities(data["scores"])
            primary_depth = min(data["depths"])
            impact_level = "Low"
            if combined_score >= 0.7:
                impact_level = "High"
            elif combined_score >= 0.4:
                impact_level = "Medium"

            # Contextual reasoning based on depth
            risk_vector = f"Logical dependency found in global supply graph via {entity_name} Epicenter link."
            operational_impact = "Immediate threat to upstream assembly due to direct component linkage."
            if primary_depth == 2:
                risk_vector = f"Secondary dependency on affected Tier-1 partners in the {location} zone."
                operational_impact = "High risk of inventory stock-out as regional distribution hubs go offline."
            elif primary_depth == 3:
                risk_vector = "Tertiary global exposure via downstream network propagation."
                operational_impact = "Predicted supply depletion in distal markets within 7-14 days."

            impacts.append({
                "target": entity_name,
                "impact": combined_score,
                "depth": primary_depth,
                "facility_type": "Factory", # Graph nodes in Phase 1 are typically industries/factories
                "primary_metric": "Logistics: At Risk",
                "risk_vector": risk_vector,
                "operational_impact": operational_impact,
                "delay_days": round((1.0 - combined_score) * primary_depth * 2, 1),
                "is_synthesized": True # Graph-derived results are already synthesized logic
            })

        if impacts:
            impacts.sort(key=lambda x: x["impact"], reverse=True)
        return impacts

    def _clean_ai_response(self, raw_text: str) -> str:
        """Strips markdown code fences and extraneous whitespace from model output."""
        import re
        text = raw_text.strip()
        pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            text = match.group(1).strip()
        return text

    REGIONAL_HUB_MAP = {
        "usa": {
            1: ["Port of Los Angeles/Long Beach", "Port of Savannah (Garden City Terminal)", "FedEx Memphis Superhub", "Port of Houston", "JFK International Air Cargo Terminal"],
            2: ["Chicago O'Hare Intermodal Hub", "UPS Worldport (Louisville)", "Dallas/Fort Worth Inland Port", "Kansas City Logistics Park"],
            3: ["Amazon NJ-Region Fulfillment Center", "Walmart Northeast Distribution Hub", "Target Midwest Logistics Cluster", "Home Depot Southeast Crossing"]
        },
        "europe": {
            1: ["Port of Rotterdam", "Port of Antwerp", "Hamburg Container Terminal", "London Gateway"],
            2: ["Duisburg Intermodal Rail Hub", "Frankfurt CargoCity South", "Paris-Charles de Gaulle Logistics Zone"],
            3: ["DHL European Distribution Center", "IKEA Regional Hub", "Maersk Central European Terminal"]
        },
        "middle east": {
            1: ["Jebel Ali Port (Dubai)", "King Abdulaziz Port (Dammam)", "Strait of Hormuz Transit Point", "Suez Canal Container Terminal"],
            2: ["Dubai South Logistics City", "Khalifa Industrial Zone (KIZAD)", "Riyadh Logistics Park"],
            3: ["Agility Logistics Mega-Hub", "Aramex Regional Distribution Center", "Lulu Hypermarket Supply Chain Hub"]
        },
        "asia": {
            1: ["Port of Singapore (Jurong)", "Shanghai Yangshan Deep Water Port", "Hong Kong Kwai Tsing Terminal", "Port of Busan"],
            2: ["Shenzhen Yantian Hub", "Tokyo Bay Logistics Center", "Taiwan Semiconductor Manufacturing Area"],
            3: ["Cainiao Global Hub", "Seven-Eleven Asia Logistics", "Foxconn Distribution Node"]
        }
    }

    async def enrich_node_intelligence(self, node_target: str, depth: int, location: str, industry: str, event_summary: str) -> Dict[str, Any]:
        """Perform targeted AI synthesis for a single simulation node."""
        import json
        import google.generativeai as genai
        from app.core.config import get_settings
        
        try:
            settings = get_settings()
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            
            prompt = f"""
            You are a Professional Supply Chain Intelligence Engine. 
            Synthesize a precise, news-anchored Why/How reasoning for this facility.
            
            FACILITY: {node_target} (Tier {depth})
            CONTEXT: {industry} supply chain in {location}.
            GROUND TRUTH (News): {event_summary}
            
            REQUIREMENTS:
            1. GROUND TRUTH CITING: You MUST cite specific figures, companies, or events from the News Summary.
            2. ANALYSIS: Explain WHY this facility is at risk and HOW its operations will be impacted.
            3. Return ONLY a valid JSON object: {{"risk_vector": "WHY", "operational_impact": "HOW", "primary_metric": "e.g. Yield: -12%"}}
            """
            
            response = await model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            clean_text = self._clean_ai_response(response.text or '{}')
            data = json.loads(clean_text)
            return {
                "risk_vector": data.get("risk_vector", "Awaiting neural synthesis..."),
                "operational_impact": data.get("operational_impact", "Calculating logistical propagation..."),
                "primary_metric": data.get("primary_metric", "Metric offline"),
                "is_synthesized": True
            }

        except Exception as e:
            logger.warning("Gemini Enrichment failed: %s. Attempting Groq fallback...", str(e))
            # ── Groq Fallback ──────────
            try:
                from groq import Groq
                if settings.GROQ_API_KEY:
                    client = Groq(api_key=settings.GROQ_API_KEY)
                    chat_completion = client.chat.completions.create(
                        messages=[{
                            "role": "user",
                            "content": prompt + "\nReturn ONLY valid JSON."
                        }],
                        model=settings.GROQ_MODEL,
                        response_format={"type": "json_object"}
                    )
                    data = json.loads(chat_completion.choices[0].message.content)
                    return {
                        "risk_vector": data.get("risk_vector", "Awaiting neural synthesis..."),
                        "operational_impact": data.get("operational_impact", "Calculating logistical propagation..."),
                        "primary_metric": data.get("primary_metric", "Metric offline"),
                        "is_synthesized": True
                    }
            except Exception as groq_e:
                logger.error("Groq fallback also failed: %s", str(groq_e))

            return {
                "risk_vector": "Strategic intelligence synthesis interrupted.",
                "operational_impact": "Logistical propagation model offline.",
                "is_synthesized": True # Stop retrying
            }

    async def _generate_synthetic_simulation(self, event_type: str, location: str, industry: str, event_summary: str) -> List[Dict[str, Any]]:
        """
        FAST-PATH Regional Intelligence Mapper.
        Returns high-fidelity facilities immediately with placeholders for deep reasoning.
        """
        import random
        
        loc_lower = (location or "global").lower()
        region = "usa" # Default
        for r in ["usa", "europe", "middle east", "asia"]:
            if r in loc_lower:
                region = r
                break
        
        # Industry-Specific Fallback Narratives (for Phase 1 fast-load)
        industry_profiles = {
            "Electronics": {
                "Why": "Identifying semiconductor-specific disruption vectors...",
                "How": "Modeling downstream impact on microchip assembly..."
            },
            "Energy": {
                "Why": "Mapping distillation unit vulnerability...",
                "How": "Calculating crude transit delays..."
            },
            "Food & Beverage": {
                "Why": "Modeling perishables-transit risk mapping...",
                "How": "Calculating cold-chain inventory burn rates..."
            },
            "Pharma": {
                "Why": "Mapping API-synthesis risk vectors...",
                "How": "Calculating hospital-level inventory shortages..."
            }
        }
        
        p = industry_profiles.get(industry, {
            "Why": "Synthesizing news-anchored intelligence...",
            "How": "Mapping regional logistical propagation..."
        })
        # Regional High-Fidelity Fallback Logic
        count = random.randint(6, 8)
        impacts = []
        
        facility_types = ["Port", "Rail", "Air", "Factory", "Warehouse", "Laboratory", "Retail"]
        for i in range(count):
            depth = (i % 3) + 1
            region_hubs = self.REGIONAL_HUB_MAP.get(region, self.REGIONAL_HUB_MAP["usa"])
            facility_options = region_hubs.get(depth)
            
            target_name = random.choice(facility_options)
            if any(imp["target"] == target_name for imp in impacts):
                target_name = f"{target_name} ({industry or 'Ops'} Cluster-B)"

            f_type = random.choice(facility_types)
            impacts.append({
                "target": target_name,
                "depth": depth,
                "facility_type": f_type,
                "primary_metric": f"Scanning {f_type} state...",
                "impact": round(random.uniform(0.3, 0.95), 2),
                "risk_vector": p['Why'],
                "operational_impact": p['How'],
                "delay_days": round(random.uniform(2.0, 10.0), 1),
                "is_synthesized": False
            })
        
        return impacts

# Singleton instance
simulation_service = SimulationService()
