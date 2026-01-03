import os
import json
from typing import Set

def get_cache_path(workspace: str) -> str:
    os.makedirs(workspace, exist_ok=True)
    return os.path.join(workspace, "seen_items.json")

def load_seen_items(workspace: str) -> Set[str]:
    path = get_cache_path(workspace)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()

def save_seen_items(workspace: str, seen: Set[str]):
    path = get_cache_path(workspace)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(list(seen), f, indent=2)
