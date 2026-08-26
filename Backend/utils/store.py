"""
Lightweight run history backing the dashboard.

Uses stdlib sqlite3 with a connection per call — Flask runs threaded, and a
shared connection would need its own locking. These are tiny, infrequent
queries, so per-call connections cost nothing worth optimising.
"""

import json
import os
import sqlite3
import time

DB_PATH = os.path.join("uploads", "sentinel.db")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT,
    email      TEXT NOT NULL,
    company    TEXT,
    message    TEXT,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    kind          TEXT    NOT NULL,           -- 'detect' | 'train'
    filename      TEXT    NOT NULL,
    created_at    REAL    NOT NULL,
    status        TEXT    NOT NULL,
    total_frames  INTEGER DEFAULT 0,
    anomaly_count INTEGER DEFAULT 0,
    threshold     REAL,
    max_score     REAL,
    mean_score    REAL,
    calibrated    INTEGER DEFAULT 0,
    narration     TEXT,
    clip_url      TEXT,
    scores_json   TEXT                        -- downsampled series for the chart
);
"""


def _connect():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _connect() as conn:
        conn.executescript(_SCHEMA)


def record_run(**fields):
    """Insert a run and return its id. Unknown keys are ignored."""
    allowed = (
        "kind", "filename", "created_at", "status", "total_frames",
        "anomaly_count", "threshold", "max_score", "mean_score",
        "calibrated", "narration", "clip_url", "scores_json",
    )
    data = {k: v for k, v in fields.items() if k in allowed}
    data.setdefault("created_at", time.time())
    data.setdefault("kind", "detect")
    data.setdefault("status", "complete")
    data.setdefault("filename", "unknown")

    cols = ", ".join(data)
    placeholders = ", ".join("?" for _ in data)
    with _connect() as conn:
        cur = conn.execute(
            f"INSERT INTO runs ({cols}) VALUES ({placeholders})", list(data.values())
        )
        return cur.lastrowid


def record_contact(name, email, company, message):
    """Persist a landing-page enquiry. Returns the new row id."""
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO contacts (name, email, company, message, created_at)"
            " VALUES (?, ?, ?, ?, ?)",
            (name, email, company, message, time.time()),
        )
        return cur.lastrowid


def list_contacts(limit=50):
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, name, email, company, message, created_at FROM contacts"
            " ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def list_runs(limit=20):
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, kind, filename, created_at, status, total_frames,"
            " anomaly_count, threshold, max_score, calibrated, narration, clip_url"
            " FROM runs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_run(run_id):
    with _connect() as conn:
        row = conn.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()
    if not row:
        return None
    run = dict(row)
    if run.get("scores_json"):
        try:
            run["scores"] = json.loads(run["scores_json"])
        except (TypeError, ValueError):
            run["scores"] = []
    run.pop("scores_json", None)
    return run


def get_stats():
    """Aggregates for the dashboard tiles."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT"
            "  COUNT(*)                                   AS total_runs,"
            "  COALESCE(SUM(anomaly_count), 0)            AS total_anomalies,"
            "  COALESCE(SUM(total_frames), 0)             AS total_frames,"
            "  SUM(CASE WHEN anomaly_count > 0 THEN 1 ELSE 0 END) AS flagged_runs"
            " FROM runs WHERE kind = 'detect'"
        ).fetchone()

        recent = conn.execute(
            "SELECT anomaly_count, total_frames, created_at FROM runs"
            " WHERE kind = 'detect' ORDER BY created_at DESC LIMIT 12"
        ).fetchall()

    stats = dict(row) if row else {}
    total_frames = stats.get("total_frames") or 0
    total_anomalies = stats.get("total_anomalies") or 0
    stats["anomaly_rate"] = (total_anomalies / total_frames) if total_frames else 0.0
    stats["flagged_runs"] = stats.get("flagged_runs") or 0

    # Sparkline: per-run anomaly rate, oldest first
    stats["recent_rates"] = [
        round((r["anomaly_count"] / r["total_frames"]) if r["total_frames"] else 0.0, 5)
        for r in reversed(recent)
    ]
    return stats
