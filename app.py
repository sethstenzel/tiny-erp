from fastapi import FastAPI, HTTPException, Cookie, Depends, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
import sqlite3
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

DB_PATH = "warehouse.sqlite"

app = FastAPI(title="IndSurp Warehouse API")

# In-memory session store: token -> {username, role}
sessions: dict[str, dict] = {}


# ── Database ─────────────────────────────────────────────────────────────────

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
            pallet_rack_id     INTEGER,
            pallet_rack_label  TEXT DEFAULT '',
            pallet_rack_row    TEXT DEFAULT '',
            subsection_id      INTEGER,
            subsection_number  INTEGER,
            shelf_id           INTEGER,
            shelf_label        TEXT DEFAULT '',
            zone_id            INTEGER,
            zone_label         TEXT DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role     TEXT NOT NULL DEFAULT 'worker'
        );
    """)
    conn.execute(
        "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
        ("admin", "admin", "admin"),
    )
    conn.execute(
        "INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)",
        ("worker", "worker", "worker"),
    )
    # Add new columns to items if they don't exist yet (migration)
    existing_cols = {row["name"] for row in conn.execute("PRAGMA table_info(items)").fetchall()}
    if "url" not in existing_cols:
        conn.execute("ALTER TABLE items ADD COLUMN url TEXT DEFAULT ''")
    if "tags" not in existing_cols:
        conn.execute("ALTER TABLE items ADD COLUMN tags TEXT DEFAULT ''")
    if "subsection_name" not in existing_cols:
        conn.execute("ALTER TABLE items ADD COLUMN subsection_name TEXT DEFAULT ''")
    if "isle_id" in existing_cols and "pallet_rack_id" not in existing_cols:
        conn.execute("ALTER TABLE items RENAME COLUMN isle_id TO pallet_rack_id")
    if "isle_label" in existing_cols and "pallet_rack_label" not in existing_cols:
        conn.execute("ALTER TABLE items RENAME COLUMN isle_label TO pallet_rack_label")
    if "isle_row" in existing_cols and "pallet_rack_row" not in existing_cols:
        conn.execute("ALTER TABLE items RENAME COLUMN isle_row TO pallet_rack_row")
    conn.commit()
    conn.close()


init_db()


# ── Auth helpers ─────────────────────────────────────────────────────────────

def get_current_user(session_id: Optional[str] = Cookie(None)):
    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return sessions[session_id]


def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Static file serving ──────────────────────────────────────────────────────

@app.get("/")
async def serve_app():
    return FileResponse("warehouse.html")


@app.get("/login")
async def serve_login():
    return FileResponse("login.html")


@app.get("/search")
async def serve_search():
    return FileResponse("search.html")


@app.get("/warehouse.css")
async def serve_css():
    return FileResponse("warehouse.css")


@app.get("/warehouse.js")
async def serve_js():
    return FileResponse("warehouse.js")


# ── Auth API ─────────────────────────────────────────────────────────────────

class LoginBody(BaseModel):
    username: str
    password: str


@app.post("/api/login")
def login(body: LoginBody, response: Response):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        (body.username, body.password),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = str(uuid.uuid4())
    sessions[token] = {"username": row["username"], "role": row["role"]}
    response.set_cookie(key="session_id", value=token, httponly=True, samesite="lax")
    return {"username": row["username"], "role": row["role"]}


@app.post("/api/logout")
def logout(response: Response, session_id: Optional[str] = Cookie(None)):
    if session_id and session_id in sessions:
        del sessions[session_id]
    response.delete_cookie("session_id")
    return {"ok": True}


@app.get("/api/me")
def me(user: dict = Depends(get_current_user)):
    return user


# ── Layout API ───────────────────────────────────────────────────────────────

@app.get("/api/layout")
def get_layout(user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT data FROM layout WHERE id = 1").fetchone()
    conn.close()
    if row:
        return json.loads(row["data"])
    return {"warehouses": [], "activeWarehouseIdx": 0}


class LayoutBody(BaseModel):
    data: dict


@app.put("/api/layout")
def save_layout(body: LayoutBody, user: dict = Depends(require_admin)):
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


# ── Items API ─────────────────────────────────────────────────────────────────

@app.get("/api/items")
def get_items(q: str = "", user: dict = Depends(get_current_user)):
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
    url: str = ""
    tags: str = ""
    added_at: str = ""
    location_type: str = "shelf"
    warehouse_id: Optional[int] = None
    warehouse_name: str = ""
    pallet_rack_id: Optional[int] = None
    pallet_rack_label: str = ""
    pallet_rack_row: str = ""
    subsection_id: Optional[int] = None
    subsection_number: Optional[int] = None
    subsection_name: str = ""
    shelf_id: Optional[int] = None
    shelf_label: str = ""
    zone_id: Optional[int] = None
    zone_label: str = ""


@app.get("/api/search")
def search_items(
    q: str = "",
    item_id: str = "",
    item_type: str = "",
    category: str = "",
    tags: str = "",
    notes: str = "",
    url: str = "",
    warehouse_name: str = "",
    pallet_rack_row: str = "",
    pallet_rack_label: str = "",
    shelf_label: str = "",
    zone_label: str = "",
    location_type: str = "",
    date_from: str = "",
    date_to: str = "",
    user: dict = Depends(get_current_user),
):
    conditions: list[str] = []
    params: list = []

    if q:
        like = f"%{q.lower()}%"
        conditions.append(
            "(LOWER(item_id) LIKE ? OR LOWER(item_type) LIKE ? OR LOWER(category) LIKE ?"
            " OR LOWER(notes) LIKE ? OR LOWER(url) LIKE ? OR LOWER(tags) LIKE ?"
            " OR LOWER(warehouse_name) LIKE ? OR LOWER(pallet_rack_label) LIKE ?"
            " OR LOWER(shelf_label) LIKE ? OR LOWER(zone_label) LIKE ?)"
        )
        params.extend([like] * 10)

    for col, val in [
        ("item_id", item_id), ("item_type", item_type), ("category", category),
        ("tags", tags), ("notes", notes), ("url", url),
        ("warehouse_name", warehouse_name), ("pallet_rack_row", pallet_rack_row),
        ("pallet_rack_label", pallet_rack_label), ("shelf_label", shelf_label),
        ("zone_label", zone_label),
    ]:
        if val:
            conditions.append(f"LOWER({col}) LIKE ?")
            params.append(f"%{val.lower()}%")

    if location_type:
        conditions.append("location_type = ?")
        params.append(location_type)
    if date_from:
        conditions.append("added_at >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("added_at <= ?")
        params.append(date_to + "T23:59:59")

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    conn = get_db()
    rows = conn.execute(
        f"SELECT * FROM items {where} ORDER BY added_at DESC", params
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/items")
def add_item(body: ItemBody, user: dict = Depends(get_current_user)):
    added_at = body.added_at or datetime.now(timezone.utc).isoformat()
    conn = get_db()
    cur = conn.execute(
        """
        INSERT INTO items (
            item_id, item_type, category, notes, url, tags, added_at,
            location_type, warehouse_id, warehouse_name,
            pallet_rack_id, pallet_rack_label, pallet_rack_row,
            subsection_id, subsection_number, subsection_name,
            shelf_id, shelf_label,
            zone_id, zone_label
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            body.item_id, body.item_type, body.category, body.notes,
            body.url, body.tags, added_at,
            body.location_type, body.warehouse_id, body.warehouse_name,
            body.pallet_rack_id, body.pallet_rack_label, body.pallet_rack_row,
            body.subsection_id, body.subsection_number, body.subsection_name,
            body.shelf_id, body.shelf_label,
            body.zone_id, body.zone_label,
        ),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"id": new_id}


class PalletRackRelabelBody(BaseModel):
    pallet_rack_label: str
    pallet_rack_row: str


@app.patch("/api/items/pallet-rack/{pallet_rack_id}/label")
def relabel_pallet_rack_items(pallet_rack_id: int, body: PalletRackRelabelBody, user: dict = Depends(get_current_user)):
    conn = get_db()
    conn.execute(
        "UPDATE items SET pallet_rack_label=?, pallet_rack_row=? WHERE pallet_rack_id=?",
        (body.pallet_rack_label, body.pallet_rack_row, pallet_rack_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


class RenameWarehouseBody(BaseModel):
    old_name: str
    new_name: str


@app.patch("/api/items/rename-warehouse")
def rename_warehouse_items(body: RenameWarehouseBody, user: dict = Depends(get_current_user)):
    conn = get_db()
    conn.execute(
        "UPDATE items SET warehouse_name = ? WHERE warehouse_name = ?",
        (body.new_name, body.old_name),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


class MoveItemBody(BaseModel):
    location_type: str = "shelf"
    warehouse_id: Optional[int] = None
    warehouse_name: str = ""
    pallet_rack_id: Optional[int] = None
    pallet_rack_label: str = ""
    pallet_rack_row: str = ""
    subsection_id: Optional[int] = None
    subsection_number: Optional[int] = None
    subsection_name: str = ""
    shelf_id: Optional[int] = None
    shelf_label: str = ""
    zone_id: Optional[int] = None
    zone_label: str = ""


@app.patch("/api/items/{item_db_id}/location")
def move_item(item_db_id: int, body: MoveItemBody, user: dict = Depends(get_current_user)):
    conn = get_db()
    conn.execute(
        """UPDATE items SET
            location_type=?, warehouse_id=?, warehouse_name=?,
            pallet_rack_id=?, pallet_rack_label=?, pallet_rack_row=?,
            subsection_id=?, subsection_number=?, subsection_name=?,
            shelf_id=?, shelf_label=?,
            zone_id=?, zone_label=?
           WHERE id=?""",
        (
            body.location_type, body.warehouse_id, body.warehouse_name,
            body.pallet_rack_id, body.pallet_rack_label, body.pallet_rack_row,
            body.subsection_id, body.subsection_number, body.subsection_name,
            body.shelf_id, body.shelf_label,
            body.zone_id, body.zone_label,
            item_db_id,
        ),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.delete("/api/items/{item_db_id}")
def delete_item(item_db_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    conn.execute("DELETE FROM items WHERE id = ?", (item_db_id,))
    conn.commit()
    conn.close()
    return {"ok": True}
