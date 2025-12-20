# utils/database.py
import sqlite3
from pathlib import Path
from typing import Any, Dict, List
from datetime import datetime
import uuid

# Resolve path relative to server root
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "dockpilot.db"

def generate_id() -> str:
    return str(uuid.uuid4())

def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS profiles (
        profile_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)

    # ✅ UPDATED: Added 'icon' column definition
    cur.execute("""
    CREATE TABLE IF NOT EXISTS buttons (
        button_id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        icon TEXT,
        config TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(profile_id) REFERENCES profiles(id)
    )
    """)

    conn.commit()
    conn.close()

def ensure_default_profile() -> Dict[str, Any]:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM profiles LIMIT 1")
    row = cur.fetchone()

    if row:
        conn.close()
        return dict(row)

    profile_id = generate_id()
    profile = {
        "profile_id": profile_id,
        "name": "Default",
        "created_at": datetime.utcnow().isoformat()
    }

    cur.execute(
        """
        INSERT INTO profiles (profile_id, name, created_at)
        VALUES (?, ?, ?)
        """,
        (profile["profile_id"], profile["name"], profile["created_at"])
    )

    conn.commit()
    conn.close()
    return profile

def execute(query: str, params: tuple = ()) -> None:
    conn = get_connection()
    conn.execute(query, params)
    conn.commit()
    conn.close()

def fetch_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def fetch_one(query: str, params: tuple = ()) -> Dict[str, Any] | None:
    conn = get_connection()
    cur = conn.execute(query, params)
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None