#!/usr/bin/env python3
"""
Simple script to get sample article IDs from OpenSearch
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from opensearchpy import OpenSearch

load_dotenv()

# Get credentials from environment
# Prioritize OPENSEARCH_URL for AWS deployments
opensearch_url = os.getenv("OPENSEARCH_URL")

if opensearch_url:
    from urllib.parse import urlparse
    parsed = urlparse(opensearch_url)
    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == 'https' else 9200)
    use_ssl = parsed.scheme == 'https'
else:
    host = os.getenv("OPENSEARCH_HOST")
    port = int(os.getenv("OPENSEARCH_PORT", "9200"))
    use_ssl = True

if not host:
    raise ValueError("OPENSEARCH_HOST or OPENSEARCH_URL must be set")

username = os.getenv("OPENSEARCH_USERNAME")
password = os.getenv("OPENSEARCH_PASSWORD")

client_args = {
    "hosts": [{"host": host, "port": port}],
    "use_ssl": use_ssl,
    "verify_certs": False,
    "http_compress": True,
    "timeout": 30,
    "max_retries": 3,
    "retry_on_timeout": True,
}

if username and password:
    client_args["http_auth"] = (username, password)

print(f"Connecting to OpenSearch at {host}:{port} (SSL: {use_ssl})")

# OpenSearch client
os_client = OpenSearch(**client_args)

# Get sample articles
response = os_client.search(
    index='ti-raw-articles',
    body={
        'query': {'match_all': {}},
        'size': 5
    }
)

print("Sample articles in OpenSearch:")
for hit in response['hits']['hits']:
    source = hit['_source']
    print(f"ID: {source['id']}")
    print(f"Title: {source.get('title', 'N/A')}")
    print(f"Source: {source.get('source', 'N/A')}")
    print("---")