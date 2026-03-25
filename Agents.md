AGENTS.md
Global Supply Chain Intelligence Engine

Purpose
This document defines the behavioral rules, coding standards, architectural principles, and decision-making framework for AI agents contributing to this codebase.
The agent must always prioritize:
production-quality code
scalability and extensibility
clean architecture
maintainability
alignment with the PRD
This is not a prototype project. The system must be built as a real SaaS-grade AI platform.

1. Core Engineering Principles
1.1 Build for Scale from Day 1
Design systems as modular services
Avoid tightly coupled logic
Ensure each component can scale independently

1.2 Separation of Concerns
Strictly separate:
data ingestion
AI logic
database operations
API layer
frontend
No mixing of responsibilities.

1.3 Production Over Hacks
Never:
hardcode values
write temporary shortcuts
skip validation
ignore error handling
All code must be production-ready.

1.4 Clarity Over Cleverness
Code must be:
readable
understandable
maintainable
Avoid over-engineering.

2. System Architecture Rules
The system follows a layered architecture:
Data Layer → AI Intelligence Layer → Graph Layer → Prediction Layer → API Layer → Frontend

Each layer must:
operate independently
expose clean interfaces
be replaceable without breaking the system

3. Folder & Code Organization
The agent must strictly follow this structure:
backend/
  app/
    main.py
    routes/
    services/
    models/
    schemas/
    core/
  data_pipeline/
  ai_models/
  graph_engine/
  prediction_engine/

frontend/


Rules
Routes → only API logic
Services → business logic
Models → database models
Schemas → request/response validation
Core → configs, utilities

4. Coding Standards
4.1 Language
Primary backend: Python
Frontend: JavaScript (React)

4.2 Style Guidelines
Follow PEP8 (Python)
Use meaningful variable names
Write small, reusable functions
Avoid large monolithic files

4.3 Documentation
Every function must include:
purpose
input
output
Example:
def detect_event(text: str) -> dict:
    """
    Extracts structured supply chain event from news text.

    Args:
        text (str): Raw news article text

    Returns:
        dict: Structured event (event_type, location, industry, severity)
    """


5. Data Engineering Rules
5.1 Data Integrity
Never trust external data blindly
Always validate incoming data
Handle missing or malformed fields

5.2 Idempotency
Data pipelines must be:
repeatable
non-duplicating
Avoid duplicate event entries.

5.3 Logging
All pipelines must log:
ingestion success/failure
processing errors
model outputs

6. AI & ML Rules
6.1 Deterministic Output Structure
All AI outputs must follow strict schema:
{
  "event_type": "",
  "location": "",
  "industry": "",
  "severity": ""
}

No free-form outputs allowed.

6.2 Prompt Engineering
Prompts must be explicit and structured
Always enforce JSON output
Validate LLM responses before saving

6.3 Model Isolation
AI logic must be isolated inside:
ai_models/

No AI logic inside routes or controllers.

7. Database Rules
7.1 PostgreSQL
Used for:
events
metadata
user data

7.2 Schema Design
Tables must be:
normalized
indexed properly
designed for querying

7.3 No Direct Queries in Routes
All DB operations must go through:
services/


8. API Design Rules
8.1 REST Standards
Use consistent structure:
GET /events
POST /ingest

8.2 Response Format
Always return structured responses:
{
  "status": "success",
  "data": {}
}


8.3 Error Handling
All APIs must handle:
invalid inputs
server errors
external failures

9. Graph System Rules (Phase 2+)
Graph logic must be isolated
Use Neo4j for relationships
Never mix graph queries with relational DB logic

10. Prediction System Rules (Phase 4+)
Models must be versioned
Predictions must be explainable
No black-box outputs without reasoning

11. Frontend Rules
Use React with component-based architecture
Separate UI and data logic
Use API layer for all backend communication

12. Security Rules
Never expose secrets in code
Use environment variables
Validate all inputs
Protect APIs from misuse

13. Testing Rules
Every feature must include:
unit tests
API tests
Critical flows must be tested:
ingestion pipeline
event detection
API responses

14. Performance Rules
Avoid blocking operations
Use async where necessary
Optimize DB queries

15. Decision-Making Framework
When the agent makes decisions, prioritize:
scalability
maintainability
correctness
clarity
Never choose shortcuts over long-term design.

16. What the Agent MUST NOT Do
Build UI-heavy features before backend logic
Skip validation
Hardcode data
Mix responsibilities across layers
Ignore system architecture

17. Development Strategy
Follow PRD phases strictly:
Phase 1 → Event Intelligence
Phase 2 → Graph Modeling
Phase 3 → Ripple Simulation
Phase 4 → Prediction
Phase 5 → RAG
Phase 6 → Dashboard
Do not jump phases.

18. Definition of Done
A feature is complete only if:
code is clean and modular
API works correctly
data is validated
edge cases handled
logs are present
system is scalable

19. Final Rule
The agent is building:
A predictive intelligence system — not a demo, not a dashboard, not a prototype.
Every decision must reflect that.

This document ensures consistent, scalable, and production-quality development across the entire system.
