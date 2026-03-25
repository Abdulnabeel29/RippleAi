import asyncio
import uuid
from app.services.graph_service import graph_service

async def run():
    print('Connecting to Neo4j AuraDB...')
    await graph_service.connect()
    
    event_id = str(uuid.uuid4())
    print(f'\n[1] Generated Mock Disruption Event ID: {event_id}')
    print('[2] Injecting severe TSMC Factory Fire event directly into Neo4j Graph...')
    
    await graph_service.insert_event_to_graph(
        event_id=event_id,
        industry='Electronics',
        location='Taiwan',
        severity='critical',
        event_type='factory_fire'
    )
    
    print('[3] Graph Node Inserted. Querying cascading impacts recursively...')
    impact = await graph_service.get_affected_entities(event_id)
    
    print('\n============================')
    print('--- NEO4J GRAPH RESOLUTION ---')
    print('============================')
    print("Affected Industries:", impact.get("industries", []))
    print("Directly Affected Companies:", impact.get("companies", []))
    print("Downstream Cascading Companies:", impact.get("downstream_companies", []))
    print('============================\n')
    
    await graph_service.close()

if __name__ == '__main__':
    asyncio.run(run())
