import re
import requests
from bs4 import BeautifulSoup
from utils.common import logger

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    )
}

def fetch_page_text(url: str, timeout: int = 20, max_chars: int = 20000) -> str:
    if not url:
        return ""
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
    except Exception as e:
        logger.warning(f"[PAGE] Fetch failed: {url} ({e})")
        return ""

    soup = BeautifulSoup(r.text or "", "html.parser")

    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside", "svg"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()

    return text[:max_chars] if max_chars else text
