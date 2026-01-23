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
host = os.getenv("OPENSEARCH_HOST", "localhost")
port = int(os.getenv("OPENSEARCH_PORT", "9200"))
username = os.getenv("OPENSEARCH_USERNAME")
password = os.getenv("OPENSEARCH_PASSWORD")

# Determine if using SSL based on host
if host in {"localhost", "127.0.0.1"}:
    use_ssl = False
else:
    use_ssl = True

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