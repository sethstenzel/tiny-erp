from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import sqlite3
import json
from datetime import datetime, timezone
from typing import Optional

DB_PATH = "warehouse.sqlite"

app = FastAPI(title="IndSurp Warehouse API")


# ── Database ────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS layout (
            id      INTEGER PRIMARY KEY DEFAULT 1,
            data    TEXT    NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS items (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id            TEXT NOT NULL,
            item_type          TEXT DEFAULT '',
            category           TEXT DEFAULT '',
            notes              TEXT DEFAULT '',
            added_at           TEXT NOT NULL,
            location_type      TEXT NOT NULL DEFAULT 'shelf',
            warehouse_id       INTEGER,
            warehouse_name     TEXT DEFAULT '',
            isle_id            INTEGER,
            isle_label         TEXT DEFAULT '',
            isle_row           TEXT DEFAULT '',
            subsection_id      INTEGER,
            subsection_number  INTEGER,
            shelf_id           INTEGER,
            shelf_label        TEXT DEFAULT '',
            zone_id            INTEGER,
            zone_label         TEXT DEFAULT ''
        );
    """)
    conn.commit()
    conn.close()


init_db()


# ── Static file serving ──────────────────────────────────────────────────────

@app.get("/")
async def serve_app():
    return FileResponse("warehouse.html")


@app.get("/warehouse.css")
async def serve_css():
    return FileResponse("warehouse.css")


@app.get("/warehouse.js")
async def serve_js():
    return FileResponse("warehouse.js")


# ── Layout API ───────────────────────────────────────────────────────────────

@app.get("/api/layout")
def get_layout():
    conn = get_db()
    row = conn.execute("SELECT data FROM layout WHERE id = 1").fetchone()
    conn.close()
    if row:
        return json.loads(row["data"])
    return {"warehouses": [], "activeWarehouseIdx": 0}


class LayoutBody(BaseModel):
    data: dict


@app.put("/api/layout")
def save_layout(body: LayoutBody):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    conn.execute(
        """
        INSERT INTO layout (id, data, updated_at) VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
        """,
        (json.dumps(body.data), now),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Items API ────────────────────────────────────────────────────────────────

@app.get("/api/items")
def get_items(q: str = ""):
    conn = get_db()
    if q:
        rows = conn.execute(
            "SELECT * FROM items WHERE LOWER(item_id) LIKE ?",
            (f"%{q.lower()}%",),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM items").fetchall()
    conn.close()
    return [dict(r) for r in rows]


class ItemBody(BaseModel):
    item_id: str
    item_type: str = ""
    category: str = ""
    notes: str = ""
    added_at: str = ""
    location_type: str = "shelf"
    warehouse_id: Optional[int] = None
    warehouse_name: str = ""
    isle_id: Optional[int] = None
    isle_label: str = ""
    isle_row: str = ""
    subsection_id: Optional[int] = None
    subsection_number: Optional[int] = None
    shelf_id: Optional[int] = None
    shelf_label: str = ""
    zone_id: Optional[int] = None
    zone_label: str = ""


@app.post("/api/items")
def add_item(body: ItemBody):
    added_at = body.added_at or datetime.now(timezone.utc).isoformat()
    conn = get_db()
    cur = conn.execute(
        """
        INSERT INTO items (
            item_id, item_type, category, notes, added_at,
            location_type, warehouse_id, warehouse_name,
            isle_id, isle_label, isle_row,
            subsection_id, subsection_number,
            shelf_id, shelf_label,
            zone_id, zone_label
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            body.item_id, body.item_type, body.category, body.notes, added_at,
            body.location_type, body.warehouse_id, body.warehouse_name,
            body.isle_id, body.isle_label, body.isle_row,
            body.subsection_id, body.subsection_number,
            body.shelf_id, body.shelf_label,
            body.zone_id, body.zone_label,
        ),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"id": new_id}


@app.delete("/api/items/{item_db_id}")
def delete_item(item_db_id: int):
    conn = get_db()
    conn.execute("DELETE FROM items WHERE id = ?", (item_db_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
