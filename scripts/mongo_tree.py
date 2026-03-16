#!/usr/bin/env python3
"""
MongoDB Database Tree Viewer
Connects to MongoDB and displays a full tree of:
  - All databases
  - Collections inside each database
  - Document count per collection
  - Storage size per collection (in human-readable format)
  - Total stats per database and overall

Output is printed to console AND saved to scripts/mongo_tree_output.txt
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime

# ── Try to import pymongo ──────────────────────────────────────────────────────
try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
except ImportError:
    print("❌  pymongo is not installed.")
    print("    Run:  pip install pymongo[srv]")
    sys.exit(1)

# ── Load MONGODB_URI from .env ─────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent          # scripts/
ROOT_DIR   = SCRIPT_DIR.parent                        # project root

def load_env(env_path: Path) -> dict:
    """Parse a .env file and return key=value pairs."""
    env = {}
    if not env_path.exists():
        return env
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, val = line.partition("=")
                env[key.strip()] = val.strip().strip('"').strip("'")
    return env

env   = load_env(ROOT_DIR / ".env")
MONGO_URI = env.get("MONGODB_URI") or os.environ.get("MONGODB_URI")

if not MONGO_URI:
    print("❌  MONGODB_URI not found in .env or environment variables.")
    sys.exit(1)

# ── Helpers ────────────────────────────────────────────────────────────────────
def human_size(bytes_val: int) -> str:
    """Convert bytes to human-readable string."""
    if bytes_val < 0:
        return "0 B"
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if bytes_val < 1024:
            return f"{bytes_val:.2f} {unit}" if unit != "B" else f"{bytes_val} B"
        bytes_val /= 1024
    return f"{bytes_val:.2f} PB"

def plural(n: int, word: str) -> str:
    return f"{n:,} {word}{'s' if n != 1 else ''}"

# System databases to skip (you can comment these out to show them)
SKIP_DBS = {"admin", "local", "config"}

# ── Main ───────────────────────────────────────────────────────────────────────
def build_tree() -> str:
    lines = []

    def p(text=""):
        lines.append(text)

    # Header
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    p("=" * 72)
    p(f"  MongoDB Database Tree  —  generated {now}")
    p(f"  URI: {MONGO_URI[:60]}{'...' if len(MONGO_URI) > 60 else ''}")
    p("=" * 72)
    p()

    # Connect
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10_000, tls=True,
                             tlsAllowInvalidCertificates=True)
        client.admin.command("ping")
        p(f"  ✅  Connected successfully")
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        p(f"  ❌  Connection failed: {e}")
        return "\n".join(lines)

    p()

    # Gather all database names
    try:
        all_dbs = client.list_database_names()
    except Exception as e:
        p(f"  ❌  Could not list databases: {e}")
        return "\n".join(lines)

    user_dbs  = [db for db in all_dbs if db not in SKIP_DBS]
    sys_dbs   = [db for db in all_dbs if db     in SKIP_DBS]

    grand_total_docs    = 0
    grand_total_storage = 0
    grand_total_indexes = 0

    # ── Iterate databases ──────────────────────────────────────────────────────
    for db_idx, db_name in enumerate(user_dbs):
        is_last_db = (db_idx == len(user_dbs) - 1)
        db_branch  = "└──" if is_last_db else "├──"
        child_pad  = "    " if is_last_db else "│   "

        try:
            db          = client[db_name]
            db_stats    = db.command("dbstats")
            db_storage  = int(db_stats.get("storageSize", 0))
            db_data     = int(db_stats.get("dataSize",    0))
            db_indexes  = int(db_stats.get("indexSize",   0))
            db_objs     = int(db_stats.get("objects",     0))
            db_colls    = db_stats.get("collections", 0)
        except Exception as e:
            p(f"  {db_branch} 📁 {db_name}  ⚠  could not read stats: {e}")
            continue

        p(f"  {db_branch} 📁  {db_name}")
        p(f"  {child_pad}     {plural(db_objs, 'document')} · "
          f"data {human_size(db_data)} · "
          f"storage {human_size(db_storage)} · "
          f"indexes {human_size(db_indexes)}")

        grand_total_docs    += db_objs
        grand_total_storage += db_storage + db_indexes
        grand_total_indexes += db_indexes

        # Collections
        try:
            coll_names = db.list_collection_names()
        except Exception:
            coll_names = []

        if not coll_names:
            p(f"  {child_pad}  (no collections)")
            p()
            continue

        # Sort collections alphabetically
        coll_names.sort()

        for c_idx, coll_name in enumerate(coll_names):
            is_last_c  = (c_idx == len(coll_names) - 1)
            c_branch   = "└──" if is_last_c else "├──"
            c_detail   = "    " if is_last_c else "│   "

            try:
                coll_stats   = db.command("collstats", coll_name)
                doc_count    = int(coll_stats.get("count",       0))
                data_size    = int(coll_stats.get("size",        0))
                storage_size = int(coll_stats.get("storageSize", 0))
                index_size   = int(coll_stats.get("totalIndexSize", 0))
                num_indexes  = int(coll_stats.get("nindexes",    0))
                avg_obj_size = int(coll_stats.get("avgObjSize",  0))
            except Exception:
                doc_count = db[coll_name].count_documents({})
                data_size = storage_size = index_size = avg_obj_size = 0
                num_indexes = 0

            icon = "📄" if doc_count > 0 else "📭"
            p(f"  {child_pad}{c_branch} {icon}  {coll_name}")
            p(f"  {child_pad}{c_detail}      {plural(doc_count, 'document')} · "
              f"data {human_size(data_size)} · "
              f"storage {human_size(storage_size)} · "
              f"avg {human_size(avg_obj_size)}/doc · "
              f"{num_indexes} index{'es' if num_indexes != 1 else ''} ({human_size(index_size)})")

        p()

    # ── System databases (brief) ───────────────────────────────────────────────
    if sys_dbs:
        p("  ── System databases (skipped) " + "─" * 38)
        for db_name in sys_dbs:
            p(f"       ⚙   {db_name}")
        p()

    # ── Grand totals ───────────────────────────────────────────────────────────
    p("=" * 72)
    p(f"  TOTALS  ({len(user_dbs)} user database{'s' if len(user_dbs) != 1 else ''})")
    p(f"    Documents : {grand_total_docs:,}")
    p(f"    Storage   : {human_size(grand_total_storage)}  (data + indexes)")
    p(f"    Indexes   : {human_size(grand_total_indexes)}")
    p("=" * 72)

    client.close()
    return "\n".join(lines)


if __name__ == "__main__":
    output = build_tree()

    # Print to console
    print(output)

    # Save to file
    out_file = SCRIPT_DIR / "mongo_tree_output.txt"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(output)

    print(f"\n  📝  Output saved to: {out_file}")
