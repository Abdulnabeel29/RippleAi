# RippleAi: Global Supply Chain Intelligence Engine

Predicting Supply Chain Disruptions Before They Impact Industries.

---

## 🌟 Overview & Purpose

**RippleAi** is a SaaS-grade Predictive Supply Chain Intelligence Engine designed to ingest global unstructured data (e.g., news, logistics logs, weather feeds), extract and classify supply chain disruption events, map relationships in a graph network, simulate ripple effect propagation, and predict future disruption risk levels.

The platform is designed to shift supply chain risk management from **reactive** (mitigating disruptions that have already occurred) to **proactive** (predicting delays, probability of occurrences, and mapping downstream multi-tier supplier dependencies before they materialize).

---

## 🚀 Key Features by Architecture Phase

The project is structured according to a strict phased roadmap:

1. **Phase 1: Event Intelligence (MVP)**
   - Periodically fetches unstructured news from NewsAPIs.
   - Detects supply chain disruption events using Google Gemini AI, extracting: `event_type`, `location`, `industry`, `severity`, and `confidence_score`.
   - Persists events in a SQLite database (local dev) or Supabase (production).
2. **Phase 2: Supply Chain Graph**
   - Connects companies, suppliers, facilities, and industries.
   - Builds mapping dependencies in a Neo4j Graph Database.
3. **Phase 3: Ripple Effect Simulation**
   - Traverses Neo4j graph nodes to trace disruption propagation routes.
   - Computes downstream impact scores using a distance-based decay model.
4. **Phase 4: Predictive Intelligence**
   - Estimates delay times and disruption probabilities using historical events and graph topology.
5. **Phase 5: Knowledge Intelligence (RAG)**
   - Indexes unstructured articles using Sentence Transformers vector embeddings.
   - Generates contextual, reasoned risk explanations via LLM context-retrieval.
6. **Phase 6: Interactive Dashboard**
   - Features a global Mapbox risk map, real-time event feeds, D3-based dependency graph visualizations, and predictions dashboard.

---

## 📁 Repository Structure

```tree
RippleAi/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py             # Application settings & environment variables
│   │   │   ├── database.py           # Async Database session & table creation
│   │   │   └── logging.py            # Central logging config
│   │   ├── models/                   # SQLAlchemy Database models
│   │   ├── routes/                   # FastAPI endpoint routers (health, events, ingestion, etc.)
│   │   ├── schemas/                  # Pydantic schemas for request/response validation
│   │   ├── services/                 # Core logic (AI, Graph, Ingestion, Predictions, RAG, etc.)
│   │   └── main.py                   # FastAPI Application Entrypoint
│   ├── requirements.txt              # Backend dependencies
│   ├── sanity_check.py               # Local loop & duplicate isolation tests
│   ├── focused_validation.py         # Post-fix validation suite (resilience & quality)
│   ├── backend_validation.py         # Full end-to-end API test validation suite
│   ├── backfill_graph.py             # Script to map DB events to Neo4j Graph
│   ├── backfill_embeddings.py        # Script to generate vector embeddings for articles
│   ├── backfill_unknown_events.py    # Script to re-classify events via Gemini
│   ├── reset_supabase.py             # Dev utility to reset postgres schemas
│   └── seed_real_events.py           # Dev utility to seed initial events
└── frontend/
    ├── src/                          # React components & pages
    ├── index.html                    # HTML markup entry
    ├── package.json                  # Frontend scripts & dependencies
    ├── tailwind.config.js            # Tailwind CSS styling config
    └── vite.config.js                # Vite development server config
```

---

## ⚙️ Prerequisites & Setup

Ensure you have the following installed:
- Python 3.10+
- Node.js v18+ & npm
- Neo4j Database Server (running locally on port `7687` or via AuraDB)
- API Keys: Google Gemini API Key and NewsAPI Key

### 1. Configuration Setup

Copy the template env files and update them with your API keys and configuration credentials.

#### Backend Configuration
Navigate to the `backend/` directory, copy [backend/.env.example](file:///c:/Users/dell/Desktop/RippleAi/backend/.env.example) to `.env`, and customize:
```env
# Database URL (SQLite default for local dev)
DATABASE_URL=sqlite+aiosqlite:///supply_chain.db

# LLM APIs
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

# News API
NEWS_API_KEY=your-news-api-key

# Neo4j Configurations
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password
```

#### Frontend Configuration
Navigate to the `frontend/` directory and check/update the `.env` settings:
```env
VITE_MAPTILER_KEY=your-maptiler-key
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 🛠️ First-Time Setup & Execution

To run this project completely end-to-end with all features (Database, Graph, Vector Embeddings, and Web Apps) working locally, follow this chronological guide.

### 1. Start Infrastructure (Neo4j)

The predictive simulation requires a Neo4j graph database. You can quickly spin one up using Docker:

```bash
# Run Neo4j container locally on port 7687
docker run \
    --name ripple-neo4j \
    -p 7474:7474 -p 7687:7687 \
    -d \
    -e NEO4J_AUTH=neo4j/password \
    neo4j:latest
```

### 2. Initialize Database & Backfill Data (Backend)

Before starting the server, you need to initialize the database and populate it with initial data, graph nodes, and embeddings.

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Initialize Database & Tables
python reset_supabase.py

# 5. Seed initial supply chain events
python seed_real_events.py

# 6. Sync events into the Neo4j Graph
python backfill_graph.py

# 7. Generate Vector Embeddings (for RAG features)
python backfill_embeddings.py
```

### 3. Start the Backend Server

While still in the `backend` directory with your virtual environment activated:

```bash
# Run the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- The backend API will be available at: `http://127.0.0.1:8000`
- Interactively explore API docs at: `http://127.0.0.1:8000/docs`

### 4. Start the Frontend Application

Open a new terminal window/tab:

```bash
# 1. Navigate to the frontend folder
cd frontend

# 2. Install Node packages
npm install

# 3. Start the Vite dev server
npm run dev 
```
- The frontend dashboard will run at: `http://localhost:5173` (by default, configured to proxy `/api` calls to the local backend).

---

## 🧪 Testing & Verification

A suite of verification scripts are provided to ensure the system is operational:

- **Sanity Checks (Local Graph & Duplicates Verification)**
  Tests graph relationship isolation and safeguards against duplicate nodes or self-referential graph loops.
  ```bash
  python sanity_check.py
  ```
- **Focused Post-Fix Validation**
  Simulates ingestion resilient mode under Gemini API downtime, checks event classification quality, verifies RAG explanation templates, and tests graph impacts.
  ```bash
  python focused_validation.py
  ```
- **End-to-End API Integration Suite**
  Runs full connectivity tests against a live server for ingestion, Neo4j persistence, simulations, predictions, and error stability.
  ```bash
  # Run FastAPI server first, then execute:
  python backend_validation.py
  ```

---

## 🔗 Code Reference Links

- FastAPI Entrypoint: [backend/app/main.py](file:///c:/Users/dell/Desktop/RippleAi/backend/app/main.py)
- Configuration Loader: [backend/app/core/config.py](file:///c:/Users/dell/Desktop/RippleAi/backend/app/core/config.py)
- Core Validation Suite: [backend/focused_validation.py](file:///c:/Users/dell/Desktop/RippleAi/backend/focused_validation.py)
- Frontend Configuration: [frontend/vite.config.js](file:///c:/Users/dell/Desktop/RippleAi/frontend/vite.config.js)
