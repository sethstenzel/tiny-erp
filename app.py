from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Cookie, Depends, Response, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import asyncio
import sqlite3
import json
import uuid
import shutil
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
import bcrypt

DB_PATH = "warehouse.sqlite"
BACKUP_DIR = Path("db_backups")


# ── Logging setup ─────────────────────────────────────────────────────────────

def _make_logger(name: str, path: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    if not logger.handlers:
        handler = RotatingFileHandler(
            path, maxBytes=5_242_880, backupCount=3, encoding="utf-8"
        )
        handler.setFormatter(logging.Formatter(
            "%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        ))
        logger.addHandler(handler)
    return logger

backend_log = _make_logger("backend", "backend_errors.log")
vue_log     = _make_logger("vue",     "vue_errors.log")


# ── Periodic backup scheduler ─────────────────────────────────────────────────

def _write_backup(dest: Path) -> None:
    shutil.copy2(DB_PATH, dest)


async def _backup_loop() -> None:
    """Run every 60 s; create any missing periodic backups for the current period."""
    BACKUP_DIR.mkdir(exist_ok=True)
    while True:
        try:
            now = datetime.now()
            iso = now.isocalendar()

            # Monthly — warehouse_bak_m{month}_{year}.sqlite
            monthly = BACKUP_DIR / f"warehouse_bak_m{now.month}_{now.year}.sqlite"
            if not monthly.exists():
                _write_backup(monthly)
                backend_log.info("Monthly backup created: %s", monthly.name)

            # Weekly — warehouse_bak_w{week}_{iso_year}.sqlite
            weekly = BACKUP_DIR / f"warehouse_bak_w{iso.week}_{iso.year}.sqlite"
            if not weekly.exists():
                _write_backup(weekly)
                backend_log.info("Weekly backup created: %s", weekly.name)

            # Daily — warehouse_bak_{DD}_{MM}_{YYYY}.sqlite
            daily = BACKUP_DIR / f"warehouse_bak_{now.day:02d}_{now.month:02d}_{now.year}.sqlite"
            if not daily.exists():
                _write_backup(daily)
                backend_log.info("Daily backup created: %s", daily.name)

            # Hourly — warehouse_bak_{DD}_{MM}_{YYYY}_h{H}.sqlite
            hourly = BACKUP_DIR / f"warehouse_bak_{now.day:02d}_{now.month:02d}_{now.year}_h{now.hour}.sqlite"
            if not hourly.exists():
                _write_backup(hourly)
                backend_log.info("Hourly backup created: %s", hourly.name)

        except Exception:
            backend_log.error("Backup scheduler error", exc_info=True)

        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_backup_loop())
    yield


app = FastAPI(title="IndSurp Warehouse API", lifespan=lifespan)

# In-memory session store: token -> {username, role}
sessions: dict[str, dict] = {}


# ── HTTP middleware — log 4xx/5xx and unhandled exceptions ───────────────────

@app.middleware("http")
async def log_http_errors(request: Request, call_next):
    try:
        response = await call_next(request)
        status = response.status_code
        if status >= 500:
            backend_log.error("%s %s → %d", request.method, request.url.path, status)
        elif status >= 400:
            # Skip 401 on /api/me — it's used as an auth probe on page load
            if not (status == 401 and request.url.path == "/api/me"):
                backend_log.warning("%s %s → %d", request.method, request.url.path, status)
        return response
    except Exception as exc:
        backend_log.error(
            "Unhandled exception on %s %s",
            request.method, request.url.path,
            exc_info=True,
        )
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Database ─────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    try:
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
        for _username, _plain, _role in [("admin", "admin", "admin"), ("worker", "worker", "worker")]:
            existing = conn.execute(
                "SELECT password FROM users WHERE username = ?", (_username,)
            ).fetchone()
            if existing is None:
                _hashed = bcrypt.hashpw(_plain.encode(), bcrypt.gensalt()).decode()
                conn.execute(
                    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                    (_username, _hashed, _role),
                )
            elif not existing["password"].startswith("$2"):
                # Migrate legacy plaintext password to bcrypt hash
                _hashed = bcrypt.hashpw(existing["password"].encode(), bcrypt.gensalt()).decode()
                conn.execute(
                    "UPDATE users SET password = ? WHERE username = ?",
                    (_hashed, _username),
                )
                backend_log.info("Migrated plaintext password to bcrypt hash for user '%s'", _username)
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
        elif "pallet_rack_id" not in existing_cols:
            conn.execute("ALTER TABLE items ADD COLUMN pallet_rack_id INTEGER")
        if "isle_label" in existing_cols and "pallet_rack_label" not in existing_cols:
            conn.execute("ALTER TABLE items RENAME COLUMN isle_label TO pallet_rack_label")
        elif "pallet_rack_label" not in existing_cols:
            conn.execute("ALTER TABLE items ADD COLUMN pallet_rack_label TEXT DEFAULT ''")
        if "isle_row" in existing_cols and "pallet_rack_row" not in existing_cols:
            conn.execute("ALTER TABLE items RENAME COLUMN isle_row TO pallet_rack_row")
        elif "pallet_rack_row" not in existing_cols:
            conn.execute("ALTER TABLE items ADD COLUMN pallet_rack_row TEXT DEFAULT ''")
        conn.commit()
        conn.close()
        backend_log.info("Database initialised successfully")
    except Exception:
        backend_log.critical("Database initialisation failed", exc_info=True)
        raise


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


# ── Vue error ingest ──────────────────────────────────────────────────────────

class VueErrorBody(BaseModel):
    message: str
    source:  str = ""
    stack:   str = ""
    info:    str = ""
    url:     str = ""


@app.post("/api/log-vue-error")
async def log_vue_error(body: VueErrorBody):
    parts = [f"message: {body.message}"]
    if body.info:   parts.append(f"info: {body.info}")
    if body.source: parts.append(f"source: {body.source}")
    if body.url:    parts.append(f"url: {body.url}")
    if body.stack:  parts.append(f"stack:\n{body.stack}")
    vue_log.error("\n".join(parts))
    return {"ok": True}


# ── Auth API ─────────────────────────────────────────────────────────────────

class LoginBody(BaseModel):
    username: str
    password: str


@app.post("/api/login")
def login(body: LoginBody, response: Response):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE username = ?",
        (body.username,),
    ).fetchone()
    conn.close()
    if not row or not bcrypt.checkpw(body.password.encode(), row["password"].encode()):
        backend_log.warning("Failed login attempt for user '%s'", body.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = str(uuid.uuid4())
    sessions[token] = {"username": row["username"], "role": row["role"]}
    response.set_cookie(key="session_id", value=token, httponly=True, samesite="lax")
    backend_log.info("User '%s' (%s) logged in", row["username"], row["role"])
    return {"username": row["username"], "role": row["role"]}


@app.post("/api/logout")
def logout(response: Response, session_id: Optional[str] = Cookie(None)):
    if session_id and session_id in sessions:
        username = sessions[session_id].get("username", "unknown")
        del sessions[session_id]
        backend_log.info("User '%s' logged out", username)
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
        backend_log.info("Layout loaded by '%s'", user["username"])
        return json.loads(row["data"])
    backend_log.info("Layout requested by '%s' — no layout found, returning empty", user["username"])
    return {"warehouses": [], "activeWarehouseIdx": 0}


class LayoutBody(BaseModel):
    data: dict


@app.post("/api/backup-db")
def backup_db(user: dict = Depends(require_admin)):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"warehouse_backup_{ts}.sqlite"
    shutil.copy2(DB_PATH, backup_path)
    backend_log.info("Database backed up to '%s' by '%s'", backup_path, user["username"])
    return {"ok": True, "backup": backup_path}


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
    wh_count = len(body.data.get("warehouses", []))
    backend_log.info("Layout saved by '%s' (%d warehouse(s))", user["username"], wh_count)
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
    backend_log.info(
        "Item added: id=%d item_id='%s' location=%s by '%s'",
        new_id, body.item_id, body.location_type, user["username"],
    )
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
    backend_log.info(
        "Pallet rack %d relabelled to '%s' (row '%s') by '%s'",
        pallet_rack_id, body.pallet_rack_label, body.pallet_rack_row, user["username"],
    )
    return {"ok": True}


class RenameWarehouseBody(BaseModel):
    old_name: str
    new_name: str


@app.patch("/api/items/rename-warehouse")
def rename_warehouse_items(body: RenameWarehouseBody, user: dict = Depends(get_current_user)):
    conn = get_db()
    result = conn.execute(
        "UPDATE items SET warehouse_name = ? WHERE warehouse_name = ?",
        (body.new_name, body.old_name),
    )
    conn.commit()
    conn.close()
    backend_log.info(
        "Warehouse renamed '%s' → '%s' (%d item(s) updated) by '%s'",
        body.old_name, body.new_name, result.rowcount, user["username"],
    )
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
    backend_log.info(
        "Item db_id=%d moved to %s '%s' by '%s'",
        item_db_id, body.location_type, body.warehouse_name, user["username"],
    )
    return {"ok": True}


@app.delete("/api/items/{item_db_id}")
def delete_item(item_db_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    conn.execute("DELETE FROM items WHERE id = ?", (item_db_id,))
    conn.commit()
    conn.close()
    backend_log.info("Item db_id=%d deleted by '%s'", item_db_id, user["username"])
    return {"ok": True}
