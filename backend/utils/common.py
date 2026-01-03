import re, os, json, hashlib, logging, sys
from datetime import datetime, timezone
from dateutil import parser as dateparser

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Configure logging to use stderr instead of stdout to prevent JSON contamination
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stderr  # Force all logs to stderr
)
logger = logging.getLogger("ta-pipeline")

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

# ALIAS for compatibility with feeds.py
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
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def write_json(path: str, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
