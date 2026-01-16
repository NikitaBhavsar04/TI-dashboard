#!/usr/bin/env python3

from opensearchpy import OpenSearch
from opensearchpy.exceptions import RequestError

OPENSEARCH_HOST = "localhost"
OPENSEARCH_PORT = 9200

RAW_ARTICLES_INDEX = "raw-articles"
GENERATED_ADVISORIES_INDEX = "generated-advisories"


def get_client() -> OpenSearch:
    return OpenSearch(
        hosts=[{"host": OPENSEARCH_HOST, "port": OPENSEARCH_PORT}],
        http_auth=("admin", "admin"),   # default local creds
        use_ssl=False,
        verify_certs=False,
    )


def create_raw_articles_index(client: OpenSearch):
    body = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "id":            {"type": "keyword"},
                "source":        {"type": "keyword"},
                "source_name":   {"type": "keyword"},
                "article_url":   {"type": "keyword"},
                "title":         {"type": "text"},
                "published_at":  {"type": "date"},
                "fetched_at":    {"type": "date"},

                "article_text":  {"type": "text"},

                "nested_links": {
                    "type": "nested",
                    "properties": {
                        "url":         {"type": "keyword"},
                        "anchor_text": {"type": "text"}
                    }
                },

                "extracted_iocs": {
                    "type": "nested",
                    "properties": {
                        "type":  {"type": "keyword"},
                        "value": {"type": "keyword"}
                    }
                },

                "extracted_cves": {"type": "keyword"},
                "raw_payload":    {"type": "object", "enabled": False},

                "status":         {"type": "keyword"},
                "created_at":     {"type": "date"}
            }
        }
    }

    if client.indices.exists(index=RAW_ARTICLES_INDEX):
        print(f"[=] Index already exists: {RAW_ARTICLES_INDEX}")
        return

    client.indices.create(index=RAW_ARTICLES_INDEX, body=body)
    print(f"[+] Created index: {RAW_ARTICLES_INDEX}")


def create_generated_advisories_index(client: OpenSearch):
    body = {
        "settings": {
            "number_of_shards": 1,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "id":          {"type": "keyword"},
                "article_id":  {"type": "keyword"},

                "title":       {"type": "text"},
                "criticality": {"type": "keyword"},
                "tlp":         {"type": "keyword"},

                "executive_summary": {"type": "text"},
                "impact":            {"type": "text"},
                "recommendations":  {"type": "text"},
                "patch_details":    {"type": "text"},

                "cves": {
                    "type": "nested",
                    "properties": {
                        "cve":    {"type": "keyword"},
                        "cvss":   {"type": "float"},
                        "vector": {"type": "keyword"}
                    }
                },

                "mitre_attack": {"type": "object"},
                "mbc":          {"type": "object"},

                "iocs": {
                    "type": "nested",
                    "properties": {
                        "type":       {"type": "keyword"},
                        "value":      {"type": "keyword"},
                        "confidence": {"type": "integer"}
                    }
                },

                "model_used":   {"type": "keyword"},
                "generated_at": {"type": "date"},
                "raw_llm_output": {"type": "object", "enabled": False}
            }
        }
    }

    if client.indices.exists(index=GENERATED_ADVISORIES_INDEX):
        print(f"[=] Index already exists: {GENERATED_ADVISORIES_INDEX}")
        return

    client.indices.create(index=GENERATED_ADVISORIES_INDEX, body=body)
    print(f"[+] Created index: {GENERATED_ADVISORIES_INDEX}")


def main():
    client = get_client()

    print("[*] Creating OpenSearch indices...")
    create_raw_articles_index(client)
    create_generated_advisories_index(client)
    print("[✓] Done")


if __name__ == "__main__":
    main()