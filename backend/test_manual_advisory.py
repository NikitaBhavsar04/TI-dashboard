#!/usr/bin/env python3
"""
Test script to verify OpenSearch connection and manual advisory generation
"""

import sys
import os
import json
from pathlib import Path

# Add backend directory to Python path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

def test_opensearch_connection():
    """Test OpenSearch connection"""
    try:
        from manual_advisory import os_client, RAW_INDEX
        
        # Test connection
        health = os_client.cluster.health()
        print(f"✅ OpenSearch cluster health: {health.get('status', 'unknown')}")
        
        # Test if raw articles index exists
        if os_client.indices.exists(index=RAW_INDEX):
            print(f"✅ Raw articles index '{RAW_INDEX}' exists")
            
            # Get sample count
            count = os_client.count(index=RAW_INDEX)
            print(f"✅ Raw articles count: {count.get('count', 0)}")
            
        else:
            print(f"❌ Raw articles index '{RAW_INDEX}' does not exist")
            
        return True
        
    except Exception as e:
        print(f"❌ OpenSearch connection failed: {e}")
        return False

def test_manual_advisory_generation():
    """Test manual advisory generation with a sample article ID"""
    try:
        from manual_advisory import generate_advisory_for_article
        
        # First, get a sample article ID from the index
        from manual_advisory import os_client, RAW_INDEX
        
        result = os_client.search(
            index=RAW_INDEX,
            body={"size": 1, "query": {"match_all": {}}},
            _source_includes=["id", "title"]
        )
        
        hits = result.get("hits", {}).get("hits", [])
        if not hits:
            print("❌ No sample articles found in the index")
            return False
            
        article_id = hits[0]["_source"]["id"]
        article_title = hits[0]["_source"]["title"]
        
        print(f"🧪 Testing advisory generation for article: {article_title}")
        print(f"🧪 Article ID: {article_id}")
        
        advisory = generate_advisory_for_article(article_id)
        
        print(f"✅ Advisory generated successfully!")
        print(f"✅ Advisory ID: {advisory.get('advisory_id', 'N/A')}")
        print(f"✅ Title: {advisory.get('title', 'N/A')}")
        print(f"✅ Criticality: {advisory.get('criticality', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Advisory generation failed: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Testing OpenSearch connection and manual advisory generation")
    print("=" * 60)
    
    # Test OpenSearch connection
    print("\n1. Testing OpenSearch connection...")
    if not test_opensearch_connection():
        sys.exit(1)
    
    # Test advisory generation
    print("\n2. Testing manual advisory generation...")
    if not test_manual_advisory_generation():
        sys.exit(1)
        
    print("\n✅ All tests passed!")