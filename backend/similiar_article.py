import sys
import json
import logging
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables from project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_root, '.env'))

from utils.opensearch_client import get_opensearch_client

# -----------------------------
# Logging → stderr
# -----------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# -----------------------------
# OpenSearch Setup
# -----------------------------
INDEX = "ti-raw-articles"
os_client = get_opensearch_client()

# -----------------------------
# Fetch CVEs for given article ID
# -----------------------------
def get_cves_by_article_id(article_id: str) -> List[str]:
    query = {
        "size": 1,
        "_source": ["cves"],
        "query": {
            "term": {
                "id": article_id
            }
        }
    }

    resp = os_client.search(index=INDEX, body=query)
    hits = resp.get("hits", {}).get("hits", [])

    if not hits:
        raise ValueError(f"Article ID not found: {article_id}")

    return hits[0]["_source"].get("cves", [])

# -----------------------------
# Fetch similar articles (ID + title only)
# -----------------------------
def find_similar_articles(
    article_id: str,
    cves: List[str],
    size: int = 10
) -> List[Dict[str, str]]:

    if not cves:
        return []

    query = {
        "size": size,
        "_source": ["id", "title"],
        "query": {
            "bool": {
                "must": [
                    {"terms": {"cves": cves}}
                ],
                "must_not": [
                    {"term": {"id": article_id}}
                ]
            }
        },
        "sort": [
            {"published": "desc"}
        ]
    }

    resp = os_client.search(index=INDEX, body=query)

    results = []
    for hit in resp.get("hits", {}).get("hits", []):
        src = hit["_source"]
        results.append({
            "id": src.get("id"),
            "title": src.get("title")
        })

    return results

# -----------------------------
# Main CLI Entry
# -----------------------------
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(
            "Usage: python find_similar_articles.py <raw_article_id>",
            file=sys.stderr
        )
        sys.exit(1)

    try:
        article_id = sys.argv[1]

        cves = get_cves_by_article_id(article_id)
        logger.info(f"CVEs for article {article_id}: {cves}")

        similar_articles = find_similar_articles(article_id, cves)

        # stdout → JSON only
        print(json.dumps(similar_articles, default=str))
        sys.stdout.flush()

    except Exception as e:
        logger.error(str(e))
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
