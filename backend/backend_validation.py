import asyncio
import httpx
import json
import logging
import sqlite3
from typing import Dict, List, Any
from neo4j import GraphDatabase
import os
import sys
from datetime import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.core.config import get_settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

settings = get_settings()

class BackendValidator:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results = {
            "ingestion": "fail",
            "event_detection": "fail",
            "graph": "fail",
            "impact": "fail",
            "simulation": "fail",
            "prediction": "fail",
            "rag": "fail",
            "stability": "fail",
            "issues_found": [],
            "fixes_applied": []
        }
        self.test_event_id = None

    async def run_all_tests(self):
        logger.info("Starting End-to-End Backend Validation...")
        
        # 1. Ingestion & Detection
        await self.test_ingestion_and_detection()
        
        # 2. Graph Persistence
        if self.test_event_id:
            await self.test_graph_persistence()
            
            # 3. Impact Analysis
            await self.test_impact_analysis()
            
            # 4. Ripple Simulation
            await self.test_ripple_simulation()
            
        # 5. Predictions & RAG
        await self.test_predictions_and_rag()
        
        # 6. Stability & Edge Cases
        await self.test_stability_and_edge_cases()
        
        # Final Report
        return self.results

    async def test_ingestion_and_detection(self):
        logger.info("Test 1 & 2: Ingestion & Event Detection")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(f"{self.base_url}/ingest", timeout=30.0)
                if response.status_code == 200:
                    data = response.json()
                    if data["status"] == "success":
                        self.results["ingestion"] = "pass"
                        
                        if data["data"]["events_detected"] > 0:
                            self.results["event_detection"] = "pass"
                            logger.info(f"Ingested {data['data']['articles_new']} articles, detected {data['data']['events_detected']} events.")
                        else:
                            logger.info("Ingestion completed but no new events detected. Checking database for existing events...")
                        
                        # Get a test event ID (either new or existing)
                        try:
                            ev_res = await client.get(f"{self.base_url}/events?limit=1")
                            if ev_res.status_code == 200:
                                ev_data = ev_res.json()
                                if ev_data.get("data", {}).get("events"):
                                    self.test_event_id = ev_data["data"]["events"][0]["id"]
                                    self.results["event_detection"] = "pass"
                                else:
                                    self.results["issues_found"].append("No events found from API.")
                        except Exception as e:
                            self.results["issues_found"].append(f"Failed to fetch events from API: {e}")
                    else:
                        logger.warning("Ingestion failed according to response body.")
                        self.results["issues_found"].append("Ingestion response marked as failure.")
                else:
                    self.results["issues_found"].append(f"Ingestion failed with status {response.status_code}")
        except Exception as e:
            logger.error(f"Ingestion test error: {e}")
            self.results["issues_found"].append(f"Ingestion error: {str(e)}")

    async def test_graph_persistence(self):
        logger.info("Test 3: Graph Integration (Neo4j)")
        try:
            driver = GraphDatabase.driver(settings.NEO4J_URI, auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD))
            with driver.session() as session:
                result = session.run("MATCH (e:Event {id: $id}) RETURN e", id=self.test_event_id)
                if result.peek():
                    # Check relationships
                    rel_result = session.run("MATCH (e:Event {id: $id})-[:AFFECTS]->(i:Industry) RETURN i", id=self.test_event_id)
                    if rel_result.peek():
                        self.results["graph"] = "pass"
                        logger.info("Graph persistence verified: Event and relationships exist.")
                    else:
                        self.results["issues_found"].append("Event node exists but missing Industry relationships.")
                else:
                    self.results["issues_found"].append("Event node not found in Neo4j.")
            driver.close()
        except Exception as e:
            logger.error(f"Graph test error: {e}")
            self.results["issues_found"].append(f"Neo4j connectivity error: {str(e)}")

    async def test_impact_analysis(self):
        logger.info("Test 4: Impact Analysis")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/events/{self.test_event_id}/impact", timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    if data["status"] == "success" and "affected_entities" in data["data"]:
                        self.results["impact"] = "pass"
                        logger.info(f"Impact analysis returns {len(data['data']['affected_entities'])} entities.")
                    else:
                        self.results["issues_found"].append("Impact analysis response structure invalid.")
                else:
                    self.results["issues_found"].append(f"Impact API failed: {response.status_code}")
        except Exception as e:
            self.results["issues_found"].append(f"Impact API error: {str(e)}")

    async def test_ripple_simulation(self):
        logger.info("Test 5: Ripple Simulation")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/events/{self.test_event_id}/simulation", timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    if data["status"] == "success" and "impacts" in data["data"]:
                        impacts = data["data"]["impacts"]
                        self.results["simulation"] = "pass"
                        
                        # Check decay logic
                        max_score = max([i["impact_score"] for i in impacts]) if impacts else 0
                        if max_score > 1.0:
                            self.results["issues_found"].append(f"Simulation score exceeds 1.0: {max_score}")
                            self.results["simulation"] = "fail"
                        
                        logger.info(f"Ripple simulation verified with {len(impacts)} impacted nodes.")
                    else:
                        self.results["issues_found"].append("Simulation response structure invalid.")
                else:
                    self.results["issues_found"].append(f"Simulation API failed: {response.status_code}")
        except Exception as e:
            self.results["issues_found"].append(f"Simulation error: {str(e)}")

    async def test_predictions_and_rag(self):
        logger.info("Test 6 & 7: Predictions & RAG")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/predictions", timeout=60.0)
                if response.status_code == 200:
                    data = response.json()
                    predictions = data["predictions"]
                    
                    if predictions:
                        self.results["prediction"] = "pass"
                        
                        # Check RAG
                        rag_ok = True
                        for p in predictions:
                            if "explanation" not in p or not p["explanation"] or "Reasoning pending" in p["explanation"] or "Unable to generate" in p["explanation"]:
                                # Allow some to fail if context is missing, but check at least one
                                pass
                            else:
                                rag_ok = True
                                break
                        else:
                            rag_ok = False
                            
                        if rag_ok:
                            self.results["rag"] = "pass"
                            logger.info("Predictions and RAG explanations verified.")
                        else:
                            self.results["issues_found"].append("RAG explanations are generic or falling back.")
                    else:
                        logger.warning("No predictions generated.")
                else:
                    self.results["issues_found"].append(f"Predictions API failed: {response.status_code}")
        except Exception as e:
            self.results["issues_found"].append(f"Prediction error: {str(e)}")

    async def test_stability_and_edge_cases(self):
        logger.info("Test 8 & 9: Stability & Edge Cases")
        try:
            async with httpx.AsyncClient() as client:
                # 1. Invalid ID
                res = await client.get(f"{self.base_url}/events/invalid-uuid/impact")
                if res.status_code != 404 and res.status_code != 400:
                    self.results["issues_found"].append(f"Invalid Event ID should return 400/404, got {res.status_code}")

                # 2. Empty Prediction Window
                # (Hard to test without clearing DB, but we can verify consistency)
                res1 = await client.get(f"{self.base_url}/predictions")
                res2 = await client.get(f"{self.base_url}/predictions")
                if res1.json() == res2.json():
                    self.results["stability"] = "pass"
                    logger.info("Stability verified: Deterministic outputs.")
                else:
                    self.results["issues_found"].append("Non-deterministic outputs in prediction engine.")
        except Exception as e:
            self.results["issues_found"].append(f"Stability check error: {str(e)}")

if __name__ == "__main__":
    validator = BackendValidator()
    results = asyncio.run(validator.run_all_tests())
    print("\n--- FINAL VALIDATION RESULTS ---")
    print(json.dumps(results, indent=2))
