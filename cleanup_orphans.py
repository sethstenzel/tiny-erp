#!/usr/bin/env python3
"""
cleanup_orphans.py — Detect (and optionally remove) items whose shelf or zone
no longer exists in the warehouse layout.

Usage:
    python cleanup_orphans.py                   # report only
    python cleanup_orphans.py --remove          # remove all orphans silently
    python cleanup_orphans.py --remove --prompt # remove orphans with per-item confirmation

Orphan details are always written to orphaned_items.log regardless of mode.
"""

import argparse
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

DB_PATH  = "warehouse.sqlite"
LOG_PATH = "orphaned_items.log"


# ── Helpers ───────────────────────────────────────────────────────────────────

def load_valid_ids(conn: sqlite3.Connection) -> tuple[set, set]:
    """
    Parse the layout JSON and return two sets:
        valid_shelf_ids : set of (warehouse_id, shelf_id)
        valid_zone_ids  : set of (warehouse_id, zone_id)
    """
    row = conn.execute("SELECT data FROM layout WHERE id = 1").fetchone()
    if not row:
        return set(), set()

    data = json.loads(row["data"])
    valid_shelf_ids: set[tuple[int, int]] = set()
    valid_zone_ids:  set[tuple[int, int]] = set()

    for wh in data.get("warehouses", []):
        wh_id = wh.get("id")
        if wh_id is None:
            continue

        # Pallet racks → subsections → shelves
        for pr in wh.get("palletRacks", wh.get("isles", [])):
            for sub in pr.get("subsections", []):
                for shelf in sub.get("shelves", []):
                    shelf_id = shelf.get("id")
                    if shelf_id is not None:
                        valid_shelf_ids.add((wh_id, shelf_id))

        # Zones
        for zone in wh.get("zones", []):
            zone_id = zone.get("id")
            if zone_id is not None:
                valid_zone_ids.add((wh_id, zone_id))

    return valid_shelf_ids, valid_zone_ids


def is_orphan(item: sqlite3.Row,
              valid_shelf_ids: set,
              valid_zone_ids:  set) -> bool:
    loc   = item["location_type"]
    wh_id = item["warehouse_id"]

    if loc == "shelf":
        shelf_id = item["shelf_id"]
        if wh_id is None or shelf_id is None:
            return True
        return (wh_id, shelf_id) not in valid_shelf_ids

    if loc == "zone":
        zone_id = item["zone_id"]
        if wh_id is None or zone_id is None:
            return True
        return (wh_id, zone_id) not in valid_zone_ids

    # Unknown location type — treat as orphan
    return True


def format_item(item: sqlite3.Row) -> str:
    loc = item["location_type"]
    if loc == "shelf":
        dest = (
            f"WH: {item['warehouse_name'] or item['warehouse_id']} | "
            f"PR: {item['pallet_rack_label'] or item['pallet_rack_id']} | "
            f"Sub #{item['subsection_number']} | "
            f"Shelf: {item['shelf_label'] or item['shelf_id']}"
        )
    elif loc == "zone":
        dest = (
            f"WH: {item['warehouse_name'] or item['warehouse_id']} | "
            f"Zone: {item['zone_label'] or item['zone_id']}"
        )
    else:
        dest = f"location_type={loc!r}"

    return (
        f"  db_id={item['id']}  item_id={item['item_id']!r}"
        f"  type={item['item_type']!r}  category={item['category']!r}"
        f"  added={item['added_at']}\n"
        f"    → {dest}"
    )


def confirm_item(item: sqlite3.Row) -> bool:
    """Prompt the user to confirm removal of a single item. Returns True to remove."""
    print()
    print(format_item(item))
    while True:
        answer = input("  Remove this item? [y/n]: ").strip().lower()
        if answer in ("y", "yes"):
            return True
        if answer in ("n", "no"):
            return False
        print("  Please enter y or n.")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Detect and optionally remove orphaned warehouse items."
    )
    parser.add_argument(
        "--remove",
        action="store_true",
        help="Delete orphaned items from the database.",
    )
    parser.add_argument(
        "--prompt",
        action="store_true",
        help="(requires --remove) Confirm each item individually before removing.",
    )
    args = parser.parse_args()

    if args.prompt and not args.remove:
        parser.error("--prompt requires --remove")

    if not Path(DB_PATH).exists():
        print(f"Error: database not found at '{DB_PATH}'", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Check layout table exists
    tbl = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='layout'"
    ).fetchone()
    if not tbl:
        print("Error: 'layout' table not found in database.", file=sys.stderr)
        conn.close()
        sys.exit(1)

    valid_shelf_ids, valid_zone_ids = load_valid_ids(conn)
    all_items = conn.execute("SELECT * FROM items").fetchall()

    orphans = [
        item for item in all_items
        if is_orphan(item, valid_shelf_ids, valid_zone_ids)
    ]

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── Report ────────────────────────────────────────────────────────────────
    if not orphans:
        print(f"[{timestamp}] No orphaned items found. Database is clean.")
        conn.close()
        return

    print(f"[{timestamp}] Found {len(orphans)} orphaned item(s):\n")
    for item in orphans:
        print(format_item(item))
        print()

    # ── Write log ─────────────────────────────────────────────────────────────
    with open(LOG_PATH, "a", encoding="utf-8") as log:
        log.write(f"\n{'='*70}\n")
        log.write(f"Run: {timestamp}  |  Orphans found: {len(orphans)}\n")
        log.write(f"{'='*70}\n")
        for item in orphans:
            log.write(format_item(item) + "\n")

    print(f"Orphan details written to '{LOG_PATH}'.")

    # ── Remove ────────────────────────────────────────────────────────────────
    if not args.remove:
        print("\nRun with --remove to delete them, or --remove --prompt to confirm each one.")
        conn.close()
        return

    removed = 0
    skipped = 0

    for item in orphans:
        if args.prompt:
            if not confirm_item(item):
                skipped += 1
                continue

        conn.execute("DELETE FROM items WHERE id = ?", (item["id"],))
        removed += 1

    if removed:
        conn.commit()

    conn.close()

    print(f"\nDone. Removed: {removed}  Skipped: {skipped}")

    # Append removal summary to log
    with open(LOG_PATH, "a", encoding="utf-8") as log:
        log.write(f"  → Removed: {removed}  Skipped: {skipped}\n")


if __name__ == "__main__":
    main()
