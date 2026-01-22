#!/usr/bin/env python3
"""
Simple script to get sample article IDs from OpenSearch
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from opensearchpy import OpenSearch

# OpenSearch client
os_client = OpenSearch(
    [{'host': 'localhost', 'port': 9200}],
    use_ssl=False,
    verify_certs=False,
    http_compress=True,
    timeout=30,
    max_retries=3,
    retry_on_timeout=True,
)

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