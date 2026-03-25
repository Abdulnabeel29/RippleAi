import asyncio
import uuid
import json

from app.services.graph_service import graph_service
from app.services.simulation_service import simulation_service

async def run_stability_validation():
    print("Connecting to Neo4j AuraDB...")
    await graph_service.connect()

    events_to_test = [
        {"industry": "Electronics", "location": "Taiwan", "type": "fire", "desc": "TSMC Factory Fire"},
        {"industry": "Shipping", "location": "Rotterdam", "type": "strike", "desc": "Rotterdam Port Strike"},
        {"industry": "Agriculture", "location": "Ukraine", "type": "disruption", "desc": "Wheat Supply Disruption"},
        {"industry": "Automotive", "location": "Detroit", "type": "union_strike", "desc": "Auto Maker Strike"}
    ]

    print("\n[PART 1/3] Injecting 4 distinct graph nodes...")
    for idx, e in enumerate(events_to_test):
        e["id"] = str(uuid.uuid4())
        await graph_service.insert_event_to_graph(
            event_id=e["id"],
            industry=e["industry"],
            location=e["location"],
            severity="critical",
            event_type=e["type"]
        )
        print(f"  -> Merged {e['desc']} [ID: {e['id']}]")

    print("\n[PART 2/3] Simulating Impact Multi-Path Integrity & Validation...")
    results_output = []
    
    for e in events_to_test:
        sim_data = await simulation_service.simulate_impact(e["id"])
        print(f"\n--- Simulation: {e['desc']} ---")
        print(json.dumps(sim_data, indent=2))
        results_output.append({"event": e["desc"], "impacts": sim_data})

    print("\n[PART 3/3] Double Simulation Consistency Check")
    # Verify deterministic output by running 1st event again
    first_id = events_to_test[0]["id"]
    sim_run_1 = await simulation_service.simulate_impact(first_id)
    sim_run_2 = await simulation_service.simulate_impact(first_id)
    assert sim_run_1 == sim_run_2, "Non-deterministic failure detected!"
    print("  -> Deterministic output successfully verified.")

    await graph_service.close()
    
if __name__ == "__main__":
    asyncio.run(run_stability_validation())
