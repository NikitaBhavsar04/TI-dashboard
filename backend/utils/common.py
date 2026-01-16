import re
import os
import json
import hashlib
import logging
from datetime import datetime, timezone

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ta-pipeline")

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

sha1_s = sha1

def ensure_dir(p: str):
    os.makedirs(p, exist_ok=True)

def find_cves(text: str):
    pattern = re.compile(r"CVE-\d{4}-\d{4,7}", re.I)
    return sorted(list(set(pattern.findall(text)))) or []

def sanitize_filename(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9\.\-]", "_", name)[:120]

def read_yaml(path: str):
    import yaml
    if not os.path.isabs(path):
        utils_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(utils_dir)
        path = os.path.join(project_root, path)
    
    if not os.path.exists(path):
        raise FileNotFoundError(f"Config not found: {path}")
    
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def write_json(path: str, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def append_to_json_file(file_path: str, new_items: list, id_key: str = "id"):
    """
    Append new items to JSON file without duplicates.
    
    Returns: (total_count, new_count)
    """
    # Load existing
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                all_items = json.load(f)
            except Exception:
                all_items = []
    else:
        all_items = []
    
    # Get existing IDs
    existing_ids = {item.get(id_key) for item in all_items if item.get(id_key)}
    
    # Add new items
    new_count = 0
    for item in new_items:
        if item.get(id_key) and item[id_key] not in existing_ids:
            all_items.append(item)
            existing_ids.add(item[id_key])
            new_count += 1
    
    # Write back
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(all_items, f, indent=2, ensure_ascii=False)
    
    return len(all_items), new_count