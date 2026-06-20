"""
Focused post-fix validation: ingestion under Gemini failure, event quality,
RAG explanations, and graph impact after backfill.

Run from backend/: python focused_validation.py
Optional: BASE_URL=http://127.0.0.1:8000 for tests 2-4 against live server.
"""

from __future__ import annotations

import asyncio
import json
import os
import sqlite3
import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.services.graph_service import graph_service


def _count_unknown_events(conn: sqlite3.Connection) -> int:
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM events WHERE event_type = 'unknown'")
    return int(cur.fetchone()[0])


def test1_ingestion_resilience() -> dict:
    """Simulate Gemini timeout via patched _generate_content_with_timeout; POST /ingest."""
    unique = str(uuid.uuid4())[:8]
    mock_articles = [
        {
            "title": f"Resilience test article A {unique}",
            "description": "Supply chain stress test",
            "content": "Port delays and logistics disruption.",
            "source": "validation",
            "author": None,
            "url": f"https://validation.example/resilience-a-{unique}",
            "published_at": None,
            "raw_json": {},
        },
        {
            "title": f"Resilience test article B {unique}",
            "description": "Factory output",
            "content": "Manufacturing and shipping news.",
            "source": "validation",
            "author": None,
            "url": f"https://validation.example/resilience-b-{unique}",
            "published_at": None,
            "raw_json": {},
        },
    ]

    conn = sqlite3.connect("supply_chain.db")
    unknown_before = _count_unknown_events(conn)
    conn.close()

    async def gemini_timeout(*args, **kwargs):
        raise asyncio.TimeoutError()

    # Avoid real Neo4j during TestClient lifespan; graph insert mocked per-article.
    with patch.object(graph_service, "connect", new=AsyncMock()):
        with patch.object(graph_service, "close", new=AsyncMock()):
            with patch(
                "app.services.event_detection_service._generate_content_with_timeout",
                new=gemini_timeout,
            ):
                with patch(
                    "app.services.ingestion_service.fetch_news",
                    new=AsyncMock(return_value=mock_articles),
                ):
                    with patch.object(
                        graph_service,
                        "insert_event_to_graph",
                        new=AsyncMock(return_value=None),
                    ):
                        with patch(
                            "app.services.ingestion_service.rag_service.generate_embedding_async",
                            new=AsyncMock(return_value=[0.0] * 384),
                        ):
                            with patch(
                                "app.services.ingestion_service.asyncio.sleep",
                                new=AsyncMock(return_value=None),
                            ):
                                from app.main import app as fastapi_app

                                client = TestClient(fastapi_app)
                                r = client.post("/ingest")

    payload = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    data = payload.get("data") or {}

    conn = sqlite3.connect("supply_chain.db")
    unknown_after = _count_unknown_events(conn)
    fallback_delta = unknown_after - unknown_before

    # Count events tied to our URLs
    cur = conn.cursor()
    cur.execute(
        """
        SELECT COUNT(*) FROM events e
        JOIN news_articles a ON e.source_article_id = a.id
        WHERE a.url LIKE ?
        """,
        (f"%resilience-%{unique}",),
    )
    events_for_batch = int(cur.fetchone()[0])
    conn.close()

    ok = (
        r.status_code == 200
        and payload.get("status") == "success"
        and data.get("articles_fetched") == 2
        and data.get("articles_new") == 2
        and data.get("events_detected") == 2
        and fallback_delta >= 2
        and events_for_batch == 2
    )

    return {
        "pass": ok,
        "http_status": r.status_code,
        "articles_fetched": data.get("articles_fetched"),
        "articles_new": data.get("articles_new"),
        "events_detected": data.get("events_detected"),
        "errors": data.get("errors"),
        "fallback_events_added": fallback_delta,
        "events_linked_to_mock_urls": events_for_batch,
    }


def _event_meets_quality(e: dict) -> tuple[bool, list[str]]:
    """Single-event checks: required strings, confidence in [0,1], summary meaningful."""
    issues: list[str] = []
    required_str = ("event_type", "location", "industry", "severity", "summary")
    for k in required_str:
        v = e.get(k)
        if v is None or (isinstance(v, str) and not str(v).strip()):
            issues.append(f"{e.get('id')}: empty {k}")
    cs = e.get("confidence_score")
    if cs is None:
        issues.append(f"{e.get('id')}: missing confidence_score")
    else:
        try:
            cf = float(cs)
            if not (0.0 <= cf <= 1.0):
                issues.append(f"{e.get('id')}: confidence out of range")
        except (TypeError, ValueError):
            issues.append(f"{e.get('id')}: invalid confidence_score")
    summary = (e.get("summary") or "").strip()
    if summary:
        # Meaningful: at least ~2 words or 15+ chars (short labels ok)
        words = summary.split()
        if len(words) < 2 and len(summary) < 15:
            issues.append(f"{e.get('id')}: summary too short")
    return (len(issues) == 0), issues


def test2_event_quality(base_url: str | None) -> dict:
    """Check newest events (post-fix) + broader sample; legacy rows noted separately."""
    events: list[dict] = []
    if base_url:
        import urllib.request

        req = urllib.request.Request(f"{base_url.rstrip('/')}/events?limit=10")
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
            events = (body.get("data") or {}).get("events") or []
    else:
        conn = sqlite3.connect("supply_chain.db")
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, event_type, location, industry, severity, confidence_score, summary, status
            FROM events ORDER BY detected_at DESC LIMIT 10
            """
        )
        events = [dict(row) for row in cur.fetchall()]
        conn.close()

    if not events:
        return {"pass": False, "sample_size": 0, "issues": ["no events"]}

    # Anchor: three most recent rows must all pass (validates pipeline + backfill quality).
    newest = events[:3]
    newest_issues: list[str] = []
    newest_ok = True
    for e in newest:
        ok, ev_issues = _event_meets_quality(e)
        if not ok:
            newest_ok = False
            newest_issues.extend(ev_issues)

    # Broader sample (up to 10)
    issues_all: list[str] = []
    ok_count = 0
    for e in events[:10]:
        ok, ev_issues = _event_meets_quality(e)
        if ok:
            ok_count += 1
        else:
            issues_all.extend(ev_issues)

    sample = min(10, len(events))
    # Newest three = post-fix pipeline signal; >=4/10 ok tolerates legacy seed rows in DB.
    pass_q = newest_ok and ok_count >= 4
    return {
        "pass": pass_q,
        "sample_size": sample,
        "newest_three_all_ok": newest_ok,
        "ok_in_sample": ok_count,
        "newest_issues": newest_issues[:8],
        "issues": issues_all[:12],
    }


def test3_rag(base_url: str | None) -> dict:
    if not base_url:
        return {"pass": False, "issues": ["BASE_URL not set for /predictions"]}

    import urllib.request

    bad_phrase = "unable to generate reasoned explanation"
    req = urllib.request.Request(f"{base_url.rstrip('/')}/predictions")
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read().decode())
    preds = body.get("predictions") or []
    issues: list[str] = []
    ok = True
    for i, p in enumerate(preds):
        exp = (p.get("explanation") or "").strip()
        et = str(p.get("event_type", "")).lower()
        loc = str(p.get("location", "")).lower()
        if not exp:
            issues.append(f"pred[{i}]: empty explanation")
            ok = False
            continue
        if bad_phrase in exp.lower():
            issues.append(f"pred[{i}]: generic fallback phrase")
            ok = False
        if et and et not in exp.lower():
            issues.append(f"pred[{i}]: missing event_type in text")
            ok = False
        if loc and loc not in exp.lower():
            issues.append(f"pred[{i}]: missing location in text")
            ok = False
    if not preds:
        ok = False
        issues.append("no predictions")
    return {
        "pass": ok,
        "prediction_count": len(preds),
        "issues": issues[:15],
    }


def test4_graph(base_url: str | None) -> dict:
    """Pick 3 older event IDs from DB and GET impact."""
    if not base_url:
        return {"pass": False, "issues": ["BASE_URL not set"]}

    import urllib.request
    import urllib.error

    req = urllib.request.Request(f"{base_url.rstrip('/')}/events?limit=3")
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read().decode())
    events = (body.get("data") or {}).get("events") or []
    ids = [e["id"] for e in events]

    if len(ids) < 3:
        return {"pass": False, "issues": [f"need 3 events, have {len(ids)}"]}

    results = []
    all_ok = True
    for eid in ids:
        url = f"{base_url.rstrip('/')}/events/{eid}/impact"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=30) as resp:
                code = resp.status
                body = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            code = e.code
            body = {}
        ok = code == 200 and body.get("status") == "success"
        impact = (body.get("data") or {}).get("impact") or {}
        has_rel = bool(
            impact.get("industries")
            or impact.get("companies")
            or impact.get("downstream_companies")
        )
        if not ok or not has_rel:
            all_ok = False
        results.append(
            {
                "id": eid,
                "status_code": code,
                "has_impact_lists": has_rel,
                "industries_count": len(impact.get("industries") or []),
            }
        )

    return {"pass": all_ok, "checks": results}


def main() -> None:
    base = os.environ.get("BASE_URL", "http://127.0.0.1:8000").strip() or None

    d1 = test1_ingestion_resilience()
    d2 = test2_event_quality(base)
    d3 = test3_rag(base)
    d4 = test4_graph(base)

    out = {
        "ingestion_resilience": "pass" if d1.get("pass") else "fail",
        "event_quality": "pass" if d2.get("pass") else "fail",
        "rag_reliability": "pass" if d3.get("pass") else "fail",
        "graph_backfill": "pass" if d4.get("pass") else "fail",
        "details": {
            "test1_ingestion_under_gemini_failure": d1,
            "test2_event_quality": d2,
            "test3_rag": d3,
            "test4_graph_impact": d4,
        },
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
