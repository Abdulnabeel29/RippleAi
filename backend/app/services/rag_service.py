"""
RAG (Retrieval-Augmented Generation) Service.

Handles embedding generation, vector similarity search, 
and context-driven explanation generation for predictions.
"""

import asyncio
import json
import logging
from typing import List, Dict, Any
import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import google.generativeai as genai

from app.core.config import get_settings
from app.models.news_article import NewsArticle

settings = get_settings()

logger = logging.getLogger(__name__)

class RAGService:
    """
    Service for Knowledge Intelligence using RAG.
    """

    def __init__(self):
        self._model = None
        self._model_name = "all-MiniLM-L6-v2"

    @property
    def model(self):
        """Lazy loading of the embedding model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info("Loading sentence-transformer model: %s", self._model_name)
                self._model = SentenceTransformer(self._model_name)
            except ImportError:
                logger.error("sentence-transformers not installed. Please run pip install sentence-transformers.")
                raise
        return self._model

    def generate_embedding(self, text: str) -> List[float]:
        """Generates a vector embedding for the given text."""
        if not text:
            return []
        embedding = self.model.encode(text)
        return embedding.tolist()

    async def generate_embedding_async(self, text: str) -> List[float]:
        """Runs embedding generation in a worker thread."""
        return await asyncio.to_thread(self.generate_embedding, text)

    def _normalize_embedding(self, raw_embedding: Any, expected_dim: int) -> np.ndarray | None:
        """
        Normalizes embedding data into a float vector.

        Accepts list[float] or JSON-serialized string and validates dimensions.
        """
        if raw_embedding is None:
            return None

        candidate: Any = raw_embedding
        if isinstance(raw_embedding, str):
            try:
                candidate = json.loads(raw_embedding)
            except json.JSONDecodeError:
                logger.warning("Skipping malformed embedding JSON payload.")
                return None

        if not isinstance(candidate, list) or not candidate:
            return None

        try:
            vector = np.array(candidate, dtype=float)
        except (TypeError, ValueError):
            logger.warning("Skipping embedding with non-numeric values.")
            return None

        if vector.ndim != 1 or vector.shape[0] != expected_dim:
            logger.warning(
                "Skipping embedding due to dimension mismatch: got=%s expected=%d",
                vector.shape,
                expected_dim,
            )
            return None

        return vector

    async def retrieve_context(self, query: str, db: AsyncSession, limit: int = 3) -> List[str]:
        """
        Retrieves relevant news article snippets based on vector similarity.
        
        Note: For the MVP, we perform similarity calculation in-memory as a fallback
        if the database itself doesn't offer native vector search.
        """
        try:
            query_vec_list = await self.generate_embedding_async(query)
            if not query_vec_list:
                return []
            query_vec = np.array(query_vec_list, dtype=float)
            expected_dim = query_vec.shape[0]

            # Fetch articles that have embeddings
            # In a production scenario, this would be a specialized vector query (e.g. pgvector or Pinecone)
            query_stmt = select(NewsArticle).where(NewsArticle.embedding != None)
            result = await db.execute(query_stmt)
            articles = result.scalars().all()

            if not articles:
                return []

            # Calculation using cosine similarity (via numpy)
            scored_articles = []
            for art in articles:
                art_vec = self._normalize_embedding(art.embedding, expected_dim)
                if art_vec is None:
                    continue
                # Cosine similarity: (A . B) / (||A|| * ||B||)
                norm_art = np.linalg.norm(art_vec)
                norm_query = np.linalg.norm(query_vec)
                
                if norm_art > 0 and norm_query > 0:
                    sim = np.dot(art_vec, query_vec) / (norm_art * norm_query)
                    scored_articles.append((sim, art.content or art.title))

            # Sort by similarity descending
            scored_articles.sort(key=lambda x: x[0], reverse=True)
            
            # Return top snippets
            return [text for score, text in scored_articles[:limit]]

        except Exception as e:
            logger.exception("Context retrieval failed: %s", str(e))
            return []

    def _build_rule_based_explanation(
        self,
        prediction: Dict[str, Any],
        context_docs: List[str] | None = None,
    ) -> str:
        """
        Builds deterministic fallback explanation when LLM is unavailable.
        """
        event_type = str(prediction.get("event_type", "disruption")).strip() or "disruption"
        location = str(prediction.get("location", "unknown location")).strip() or "unknown location"
        risk_level = str(prediction.get("risk_level", "elevated")).strip() or "elevated"
        probability = prediction.get("probability", 0.0)

        if context_docs:
            return (
                f"Recent disruptions in {location} involving {event_type} indicate recurring stress points, "
                f"which supports a {risk_level.lower()} risk outlook (probability {probability})."
            )

        return (
            f"Recent disruptions in {location} involving {event_type} have increased risk due to repeated "
            "occurrences and supply chain dependency concentration."
        )

    async def generate_explanation(self, prediction: Dict[str, Any], db: AsyncSession) -> str:
        """
        Generates a context-driven explanation for a specific prediction using Gemini.
        """
        try:
            # Step 1: Retrieve Context
            query = f"{prediction['event_type']} in {prediction['location']}"
            context_docs = await self.retrieve_context(query, db)
            
            context_text = "\n\n".join(context_docs) if context_docs else "No recent related news articles found."

            # Step 2: Prompt LLM
            from app.core.config import get_settings
            local_settings = get_settings()
            genai.configure(api_key=local_settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(local_settings.GEMINI_MODEL)
            
            prompt = f"""
            Explain why this disruption is likely:

            Prediction Details:
            - Event Type: {prediction['event_type']}
            - Location: {prediction['location']}
            - Probability Score: {prediction['probability']} (0.0 to 1.0)
            - Risk Level: {prediction['risk_level']}

            Historical Context from News:
            {context_text}

            Provide a concise, logical explanation (1-2 sentences). 
            Focus on the reasoning connecting the data points, not just summarizing them.
            """

            response = await model.generate_content_async(prompt)
            explanation = (response.text or "").strip()
            
            # Basic cleaning if LLM returns markdown fences
            if explanation.startswith("```"):
                explanation = explanation.split("\n", 1)[-1].rsplit("\n", 1)[0].strip()

            if explanation:
                return explanation
            return self._build_rule_based_explanation(prediction, context_docs)

        except Exception as e:
            logger.error("Explanation generation failed: %s", str(e))
            return self._build_rule_based_explanation(prediction, [])

    async def generate_decision_intelligence(self, event_type: str, location: str, severity: str, db: AsyncSession) -> Dict[str, Any]:
        """
        Generates structured Decision Intelligence including narrative, timelines, 
        and action recommendations using Gemini JSON mode based on RAG context.
        """
        try:
            # Step 1: Retrieve Context
            query = f"{event_type} disruption in {location}"
            context_docs = await self.retrieve_context(query, db, limit=5)
            context_text = "\n\n".join(context_docs) if context_docs else "No specific recent news articles found for this exact regional event."

            # Step 2: Prompt LLM requesting structured JSON
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(settings.GEMINI_MODEL)
            
            prompt = f"""
            You are a Decision Intelligence AI for Global Supply Chain Managers.
            Analyze the following disruption:
            
            Event Details:
            - Type: {event_type}
            - Location: {location}
            - Severity: {severity}
            
            Context (Recent News & Historical Docs):
            {context_text}
            
            Return a strictly formatted JSON object with exactly these keys:
            {{
                "narrative_explanation": "<Human-readable story explaining how this specific disruption spreads step-by-step>",
                "impact_analysis": {{
                    "affected_industries": ["<industry1>", "<industry2>"],
                    "estimated_delay_timeline": "<summary like '2-4 weeks' or 'Unknown'>",
                    "severity_explanation": "<why is this severity level assigned>"
                }},
                "time_based_impact": {{
                    "immediate": "<impact in 0-3 days>",
                    "short_term": "<impact in 3-7 days>",
                    "medium_term": "<impact in 7-14 days>"
                }},
                "action_recommendations": [
                    {{
                        "strategy": "<High level tactic, e.g. 'Diversify Transport'>",
                        "operational_suggestion": "<Concrete step to execute right now>"
                    }},
                    {{
                        "strategy": "<Second tactic>",
                        "operational_suggestion": "<Concrete step>"
                    }}
                ]
            }}
            """

            # Enforce JSON output globally on this specific generation call
            response = await model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )
            )
            
            clean_text = (response.text or "").strip()
            return json.loads(clean_text)

        except Exception as e:
            logger.error("Failed to generate robust decision intelligence: %s", str(e))
            # Safe Fallback payload
            return {
                "narrative_explanation": f"A recent {event_type} in {location} has been flagged for analysis. Expected wide-spread supply line destabilization.",
                "impact_analysis": {
                    "affected_industries": ["General Logistics"],
                    "estimated_delay_timeline": "Unknown",
                    "severity_explanation": "Insufficient context to assign severity reasoning."
                },
                "time_based_impact": {
                    "immediate": "Potential transport standstill at localized hub.",
                    "short_term": "Backlogs beginning to formulate across regional boundaries.",
                    "medium_term": "Inventory depletion if alternative sourcing is not secured."
                },
                "action_recommendations": [
                    {
                        "strategy": "Monitor Closely",
                        "operational_suggestion": f"Increase visibility on shipments routing through {location}."
                    }
                ]
            }

# Singleton instance
rag_service = RAGService()
