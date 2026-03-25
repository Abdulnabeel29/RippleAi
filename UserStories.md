USER STORIES DOCUMENT
Global Supply Chain Intelligence Engine

1. Purpose
This document defines the primary users, their goals, and the functional user stories required to build the platform (starting with MVP and extending to full system).
It ensures alignment between:
product vision
design decisions
engineering implementation
The goal is to clearly answer:
Who uses the system? What do they need? What value do they get?

2. USER PERSONAS

2.1 Supply Chain Manager
Description
Works in manufacturing or enterprise companies responsible for ensuring smooth supply operations.
Goals
avoid supply disruptions
identify risks early
maintain production continuity
Pain Points
late awareness of disruptions
lack of visibility beyond tier-1 suppliers
reactive decision-making

2.2 Logistics & Operations Manager
Description
Manages shipping, routes, and delivery pipelines.
Goals
optimize logistics routes
avoid delays
manage shipping risks
Pain Points
unexpected port congestion
route disruptions
lack of predictive insights

2.3 Business Analyst / Investor
Description
Analyzes market trends and supply chain signals.
Goals
identify market shifts early
anticipate shortages
make data-driven investment decisions
Pain Points
fragmented information
delayed insights
lack of predictive data

2.4 Government / Policy Analyst (Future)
Description
Monitors national supply chain risks.
Goals
ensure national supply stability
detect systemic risks
prepare contingency plans

3. MVP USER STORIES (PHASE 1)
Focus: Event Intelligence Engine

3.1 View Global Disruption Events
User Story
As a user, I want to view a list of detected global disruption events so that I can understand what is happening right now.
Acceptance Criteria
system displays events
each event shows:
event_type
location
industry
severity
timestamp

3.2 Filter Events
User Story
As a user, I want to filter events by industry, location, or severity so that I can focus on relevant disruptions.
Acceptance Criteria
filters available:
industry
severity
location
results update dynamically

3.3 View Event Details
User Story
As a user, I want to view detailed information about an event so that I can understand its context.
Acceptance Criteria
event summary displayed
source article available
timestamp visible

3.4 Trigger Data Refresh
User Story
As a system/admin user, I want to trigger data ingestion so that new events are processed.
Acceptance Criteria
POST /ingest endpoint works
new events are added

4. PHASE 2 USER STORIES (GRAPH INTELLIGENCE)

4.1 View Affected Entities
User Story
As a user, I want to see which companies or industries are affected by a disruption so that I can assess risk.
Acceptance Criteria
system shows affected:
companies
industries
results derived from graph

4.2 Explore Supply Chain Dependencies
User Story
As a user, I want to visualize supply chain relationships so that I can understand dependencies.
Acceptance Criteria
graph visualization available
nodes:
companies
suppliers
ports

5. PHASE 3 USER STORIES (RIPPLE SIMULATION)

5.1 Simulate Impact
User Story
As a user, I want to see how a disruption spreads across the supply chain so that I can anticipate downstream effects.
Acceptance Criteria
system displays cascade flow
shows impacted industries

5.2 Impact Path Visualization
User Story
As a user, I want to see the path of disruption propagation so that I understand the sequence of impact.
Acceptance Criteria
visual flow:
Event → Supplier → Industry

6. PHASE 4 USER STORIES (PREDICTION)

6.1 Predict Disruptions
User Story
As a user, I want to see predicted disruptions so that I can act before they occur.
Acceptance Criteria
probability score displayed
predicted delay shown

6.2 Risk Scoring
User Story
As a user, I want to see risk levels for industries so that I can prioritize actions.
Acceptance Criteria
industries labeled:
low
medium
high

7. PHASE 5 USER STORIES (RAG / EXPLANATION)

7.1 Understand Predictions
User Story
As a user, I want to understand why a disruption is predicted so that I trust the system.
Acceptance Criteria
explanation generated
supporting context provided

8. PHASE 6 USER STORIES (FULL PLATFORM)

8.1 Global Risk Map
User Story
As a user, I want to view a global map of risks so that I can quickly identify high-risk regions.

8.2 Real-Time Alerts
User Story
As a user, I want to receive alerts for high-risk events so that I can take immediate action.

8.3 Company Exposure Analysis
User Story
As a user, I want to analyze risk exposure for a specific company so that I understand its vulnerability.

9. USER JOURNEY (MVP)

Flow
User opens dashboard
        ↓
Views latest disruption events
        ↓
Applies filters (industry / location)
        ↓
Clicks event for details
        ↓
Understands disruption context


10. SUCCESS METRICS

MVP Metrics
number of events detected
accuracy of event extraction
API response time
user interaction with dashboard

Advanced Metrics
prediction accuracy
user retention
alert engagement

11. PRIORITIZATION

Must Have (MVP)
event ingestion
event detection
event display
filters

Should Have
graph relationships
ripple simulation

Nice to Have
predictions
alerts
advanced analytics

12. FINAL PRINCIPLE
Every user story must answer:
What decision does this help the user make?
If a feature does not improve decision-making, it should not be built.

This document ensures the product is built around real user needs, not just technical features.
