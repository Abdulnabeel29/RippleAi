"""
Graph Intelligence Service.

Manages connections to Neo4j and handles all Cypher queries
for mapping supply chain dependencies and resolving cascading disruption impacts.
"""

import logging
from typing import Any

from neo4j import AsyncDriver, AsyncGraphDatabase

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class GraphServiceError(RuntimeError):
    """Raised when a graph operation fails."""


class GraphService:
    """
    Singleton service for Neo4j graph operations.

    Handles connection pooling, graph bootstrapping for the MVP,
    inserting new events securely, and traversing relationship trees
    to find impacted entities.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.uri = settings.NEO4J_URI
        self.user = settings.NEO4J_USER
        self.password = settings.NEO4J_PASSWORD
        self.driver: AsyncDriver | None = None

    async def connect(self) -> None:
        """Initializes the Neo4j driver and bootstraps MVP data."""
        if not self.driver:
            try:
                self.driver = AsyncGraphDatabase.driver(
                    self.uri, auth=(self.user, self.password)
                )
                # Bootstrapping the mock graph
                await self._bootstrap_mock_graph()
                logger.info("Connected to Neo4j successfully.")
            except Exception as exc:
                logger.warning("Failed to connect to Neo4j (Graph Simulation will be offline): %s", str(exc))
                self.driver = None

    async def close(self) -> None:
        """Closes the Neo4j driver connection pool."""
        if self.driver:
            await self.driver.close()
            logger.info("Closed Neo4j connection.")

    async def _bootstrap_mock_graph(self) -> None:
        """
        Creates a lightweight base graph of industries and companies.
        Provides a realistic topology for MVP events to attach to.
        """
        query = """
        MERGE (i1:Industry {name: 'Electronics'})
        MERGE (i2:Industry {name: 'Automotive'})
        MERGE (i3:Industry {name: 'Shipping'})
        MERGE (i4:Industry {name: 'Pharmaceuticals'})
        MERGE (i5:Industry {name: 'Agriculture'})
        MERGE (i6:Industry {name: 'Retail'})

        MERGE (c1:Company {name: 'TSMC'})
        MERGE (c2:Company {name: 'Apple'})
        MERGE (c3:Company {name: 'Ford'})
        MERGE (c4:Company {name: 'Maersk'})
        MERGE (c5:Company {name: 'Pfizer'})
        MERGE (c6:Company {name: 'Cargill'})

        // Establish relationships
        MERGE (c1)-[:SUPPLIES_TO]->(c2)
        MERGE (c1)-[:SUPPLIES_TO]->(c3)
        MERGE (c6)-[:SUPPLIES_TO]->(i6)

        MERGE (c1)-[:BELONGS_TO]->(i1)
        MERGE (c2)-[:BELONGS_TO]->(i1)
        MERGE (c3)-[:BELONGS_TO]->(i2)
        MERGE (c4)-[:BELONGS_TO]->(i3)
        MERGE (c5)-[:BELONGS_TO]->(i4)
        MERGE (c6)-[:BELONGS_TO]->(i5)
        """
        try:
            if self.driver is not None:
                async with self.driver.session() as session:
                    await session.run(query)
                    logger.info("Mock graph bootstrapped successfully.")
            else:
                raise GraphServiceError("Neo4j driver is not initialized")
        except Exception as e:
            logger.exception("Failed to bootstrap mock graph: %s", str(e))
            raise GraphServiceError("Failed to bootstrap graph") from e

    async def insert_event_to_graph(
        self,
        event_id: str,
        industry: str,
        location: str,
        severity: str,
        event_type: str,
    ) -> None:
        """
        Maps a new supply chain disruption event into the graph.

        Connects the event node to the affected Industry and Location nodes.

        Args:
            event_id: Unique identifier matching the PostgreSQL event ID.
            industry: The impacted industry sector.
            location: The geographic location.
            severity: The severity level text.
            event_type: The type category of the event.
        """
        query = """
        // Create or match Industry and Location nodes
        MERGE (i:Industry {name: $industry})
        MERGE (l:Location {name: $location})
        
        // Create the Event node
        MERGE (e:Event {id: $event_id})
        SET e.type = $event_type, e.severity = $severity
        
        // Draw the impact relationships
        MERGE (e)-[:AFFECTS]->(i)
        MERGE (e)-[:LOCATED_IN]->(l)
        """
        try:
            if self.driver is not None:
                async with self.driver.session() as session:
                    await session.run(
                        query,
                        event_id=event_id,
                        industry=industry,
                        location=location,
                        severity=severity,
                        event_type=event_type,
                    )
                    logger.info("Inserted event '%s' into graph.", event_id)
            else:
                raise GraphServiceError("Neo4j driver is not initialized")
        except Exception as e:
            logger.exception("Failed to insert event into graph: %s", str(e))
            raise GraphServiceError("Failed to insert event into graph") from e

    async def get_affected_entities(self, event_id: str) -> dict[str, list[str]]:
        """
        Queries the graph to calculate the cascading impact of an event.

        Traverses downstream from the event through affected industries,
        the companies that belong to them, and any downstream supply chain
        dependencies.

        Args:
            event_id: The UUID/str of the event to query.

        Returns:
            dict: Containing lists of impacted industries, companies, and
                  downstream dependencies. Returns empty lists if Neo4j is
                  offline or the event has no graph node yet.
        """
        result_data: dict[str, list[str]] = {
            "industries": [],
            "companies": [],
            "downstream_companies": [],
        }

        if self.driver is None:
            logger.warning(
                "Neo4j driver unavailable — returning empty impact for event '%s'.", event_id
            )
            return result_data

        query = """
        MATCH (e:Event {id: $event_id})-[:AFFECTS]->(i:Industry)
        OPTIONAL MATCH (c:Company)-[:BELONGS_TO]->(i)
        OPTIONAL MATCH (c)-[:SUPPLIES_TO]->(downstream:Company)
        RETURN i.name AS industry,
               collect(DISTINCT c.name) AS companies,
               collect(DISTINCT downstream.name) AS downstream_companies
        """
        try:
            async with self.driver.session() as session:
                result = await session.run(query, event_id=event_id)
                records = await result.data()

                for record in records:
                    if record.get("industry"):
                        result_data["industries"].append(record["industry"])
                    if record.get("companies"):
                        result_data["companies"].extend(record["companies"])
                    if record.get("downstream_companies"):
                        result_data["downstream_companies"].extend(
                            record["downstream_companies"]
                        )

            result_data["industries"] = list(set(result_data["industries"]))
            result_data["companies"] = list(set(result_data["companies"]))
            result_data["downstream_companies"] = list(
                set(result_data["downstream_companies"])
            )

            if not result_data["industries"]:
                logger.info(
                    "No graph node found for event_id='%s' — impact is empty.", event_id
                )

        except Exception as e:
            logger.warning("Failed to fetch affected entities for '%s': %s", event_id, str(e))
            return result_data

        return result_data



# Singleton instance
graph_service = GraphService()
