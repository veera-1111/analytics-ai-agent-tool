"""
Database initialisation script.

Usage:
    python -m app.database.init          # uses DB_PATH env or /data/analytics.db
    python -m app.database.init --path ./analytics.db
"""

import argparse
import sys

from app.database.models import ALL_MODELS, db, init_db


def create_tables():
    """Create all tables and indexes if they don't exist."""
    with db:
        db.create_tables(ALL_MODELS, safe=True)
    print(f"✓ Created {len(ALL_MODELS)} tables: {[m.__name__ for m in ALL_MODELS]}")


def main():
    parser = argparse.ArgumentParser(description="Initialise the analytics SQLite database.")
    parser.add_argument("--path", type=str, default=None, help="Override DB_PATH")
    args = parser.parse_args()

    init_db(args.path)
    create_tables()
    print("✓ Database initialisation complete.")


if __name__ == "__main__":
    main()
