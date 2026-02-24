#!/usr/bin/env python3
"""
new_user.py — Create or update a user in warehouse.sqlite with a bcrypt-hashed password.

Usage:
    python new_user.py <username> <password> [--role admin|worker]

Examples:
    python new_user.py alice secret123
    python new_user.py bob mypassword --role admin
"""

import argparse
import getpass
import sqlite3
import sys
import bcrypt

DB_PATH = "warehouse.sqlite"
VALID_ROLES = ("admin", "worker")


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def upsert_user(username: str, plain_password: str, role: str) -> None:
    hashed = hash_password(plain_password)
    conn = sqlite3.connect(DB_PATH)
    try:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (username,)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE users SET password = ?, role = ? WHERE username = ?",
                (hashed, role, username),
            )
            print(f"[updated] User '{username}' password and role updated.")
        else:
            conn.execute(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                (username, hashed, role),
            )
            print(f"[created] User '{username}' created with role '{role}'.")
        conn.commit()
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create or update a user with a bcrypt-hashed password."
    )
    parser.add_argument("username", help="Username for the account")
    parser.add_argument(
        "password",
        nargs="?",
        help="Password (omit to be prompted securely)",
    )
    parser.add_argument(
        "--role",
        choices=VALID_ROLES,
        default="worker",
        help="User role (default: worker)",
    )
    args = parser.parse_args()

    if args.password:
        plain = args.password
    else:
        plain = getpass.getpass(f"Password for '{args.username}': ")
        confirm = getpass.getpass("Confirm password: ")
        if plain != confirm:
            print("Error: passwords do not match.", file=sys.stderr)
            sys.exit(1)

    if not plain:
        print("Error: password cannot be empty.", file=sys.stderr)
        sys.exit(1)

    upsert_user(args.username, plain, args.role)


if __name__ == "__main__":
    main()
