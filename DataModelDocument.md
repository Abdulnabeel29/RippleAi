DATA MODEL DOCUMENT
Global Supply Chain Intelligence Engine

Purpose
This document defines how data is structured, stored, and accessed across the platform.
The goal is to ensure:
scalability
query efficiency
clean relationships
compatibility with AI, graph modeling, and analytics
The system uses a polyglot persistence approach:
PostgreSQL → structured operational data
Neo4j → supply chain relationships
Vector DB → semantic search (RAG)
S3 → raw and historical data

1. DATA ARCHITECTURE OVERVIEW
Raw Data (News, APIs)
        ↓
Processed Data (Events)
        ↓
Relational DB (PostgreSQL)
        ↓
Graph DB (Neo4j)
        ↓
Prediction + RAG Systems


2. POSTGRESQL DATA MODEL (CORE SYSTEM)
This is the primary operational database.

2.1 TABLE: news_articles
Stores raw ingested news data.
news_articles
-------------
id (UUID, PK)
title (TEXT)
description (TEXT)
content (TEXT)
source (VARCHAR)
author (VARCHAR)
url (TEXT, UNIQUE)
published_at (TIMESTAMP)
ingested_at (TIMESTAMP)
language (VARCHAR)
raw_json (JSONB)

Notes
raw_json preserves original API response
url is unique to prevent duplicates

2.2 TABLE: events
Stores structured disruption events (core table).
events
------
id (UUID, PK)
event_type (VARCHAR)
location (VARCHAR)
country (VARCHAR)
industry (VARCHAR)
severity (VARCHAR)
confidence_score (FLOAT)
summary (TEXT)
source_article_id (UUID, FK → news_articles.id)
detected_at (TIMESTAMP)
event_time (TIMESTAMP)
status (VARCHAR)  -- active, resolved, predicted

Notes
confidence_score from AI model
status helps track lifecycle

2.3 TABLE: event_entities
Stores extracted entities (normalized structure).
event_entities
--------------
id (UUID, PK)
event_id (UUID, FK → events.id)
entity_type (VARCHAR)  -- company, port, commodity
entity_name (VARCHAR)
role (VARCHAR)  -- affected, source, impacted


2.4 TABLE: industries
industries
----------
id (UUID, PK)
name (VARCHAR, UNIQUE)
description (TEXT)


2.5 TABLE: locations
locations
---------
id (UUID, PK)
name (VARCHAR)
country (VARCHAR)
latitude (FLOAT)
longitude (FLOAT)
type (VARCHAR) -- port, city, region


2.6 TABLE: risk_scores
Stores computed risk metrics.
risk_scores
-----------
id (UUID, PK)
entity_type (VARCHAR) -- industry, region, company
entity_id (UUID)
risk_score (FLOAT)
risk_level (VARCHAR) -- low, medium, high
calculated_at (TIMESTAMP)


2.7 TABLE: predictions
Stores model outputs.
predictions
-----------
id (UUID, PK)
event_id (UUID, FK)
predicted_impact (TEXT)
probability (FLOAT)
expected_delay_days (INT)
affected_industries (JSONB)
created_at (TIMESTAMP)


3. NEO4J GRAPH DATA MODEL
Used for supply chain dependency modeling.

Node Types
(:Company)
(:Supplier)
(:Port)
(:Factory)
(:Country)
(:Commodity)
(:Industry)


Relationships
(:Supplier)-[:SUPPLIES_TO]->(:Company)
(:Company)-[:BELONGS_TO]->(:Industry)
(:Company)-[:LOCATED_IN]->(:Country)
(:Port)-[:CONNECTS_TO]->(:Port)
(:Commodity)-[:USED_IN]->(:Industry)


Example Graph
(TSMC)-[:SUPPLIES_TO]->(Apple)
(Apple)-[:BELONGS_TO]->(Electronics Industry)


Event Impact Mapping
(Event)-[:AFFECTS]->(Company)
(Event)-[:DISRUPTS]->(Port)


4. VECTOR DATABASE (RAG LAYER)
Stores semantic embeddings.

Collection: knowledge_documents
id (UUID)
content (TEXT)
embedding (VECTOR)
source (VARCHAR)
metadata (JSON)


Used For
research papers
logistics reports
trade policies
historical disruptions

5. S3 DATA STORAGE (RAW DATA)
Stores:
raw API responses
logs
historical datasets

Structure
/raw/news/
/processed/events/
/logs/
/models/


6. DATA FLOW PIPELINE

Step 1 — Ingestion
News fetched → stored in news_articles

Step 2 — Processing
AI extracts events → stored in events

Step 3 — Enrichment
Entities extracted → stored in event_entities

Step 4 — Graph Update
Events mapped to Neo4j nodes

Step 5 — Prediction
Predictions stored in predictions

Step 6 — Risk Aggregation
Risk scores computed → stored in risk_scores

7. INDEXING STRATEGY

PostgreSQL Indexes
CREATE INDEX idx_events_location ON events(location);
CREATE INDEX idx_events_industry ON events(industry);
CREATE INDEX idx_events_time ON events(detected_at);


Graph Indexes (Neo4j)
index on company name
index on industry
index on location

8. DATA VALIDATION RULES
No null event_type
No duplicate news URLs
Validate timestamps
Validate severity values

9. SCALABILITY STRATEGY
partition events table by time
use read replicas for queries
batch processing for ingestion
async pipelines

10. DATA LIFECYCLE

Event Lifecycle
Detected → Active → Predicted → Resolved → Archived


Retention
Raw data → long-term storage (S3)
Events → active DB
Old events → archive

11. SECURITY
encrypt sensitive data
restrict DB access
use environment variables

12. FINAL PRINCIPLE
The data model must:
support real-time queries
support graph traversal
support ML predictions
remain flexible for future expansion

This data model ensures the platform is scalable, query-efficient, and AI-ready from day one.
