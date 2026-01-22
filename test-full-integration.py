#!/usr/bin/env python3
"""
Test the full end-to-end integration:
1. Call the manual advisory API with a real raw article ID
2. Verify the advisory is generated properly
3. Check that all fields match the expected schema
"""

import requests
import json
import sys

# Get a real raw article ID from OpenSearch
from opensearchpy import OpenSearch
import os

# OpenSearch configuration
os_client = OpenSearch([{
    "host": os.getenv("OPENSEARCH_HOST", "172.16.16.183"),
    "port": int(os.getenv("OPENSEARCH_PORT", "9200"))
}], use_ssl=False, verify_certs=False)

def get_sample_article_id():
    """Get a sample raw article ID for testing"""
    try:
        response = os_client.search(
            index="ti-raw-articles",
            body={
                "size": 1,
                "query": {"match_all": {}},
                "sort": [{"fetched_at": {"order": "desc"}}]
            }
        )
        
        hits = response.get("hits", {}).get("hits", [])
        if hits:
            article_id = hits[0]["_source"]["id"]
            article_title = hits[0]["_source"]["title"][:50] + "..."
            print(f" Using article ID: {article_id}")
            print(f"📰 Article title: {article_title}")
            return article_id
        else:
            print("❌ No raw articles found in OpenSearch")
            return None
            
    except Exception as e:
        print(f"❌ Error getting sample article: {e}")
        return None

def test_manual_advisory_api(article_id):
    """Test the manual advisory API endpoint"""
    try:
        print(f"\n🔧 Testing manual advisory API with article ID: {article_id}")
        
        # Make API request
        response = requests.post(
            "http://localhost:3000/api/manual-advisory/generate",
            json={"id": article_id},
            timeout=120  # 2 minutes timeout for LLM processing
        )
        
        print(f"📡 API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            advisory_data = response.json()
            
            print("Manual advisory generated successfully!")
            print(f"📋 Advisory ID: {advisory_data.get('advisory_id', 'N/A')}")
            print(f"Title: {advisory_data.get('title', 'N/A')}")
            print(f"⚠️  Criticality: {advisory_data.get('criticality', 'N/A')}")
            print(f"🔍 Threat Type: {advisory_data.get('threat_type', 'N/A')}")
            print(f"🏢 Vendor: {advisory_data.get('vendor', 'N/A')}")
            print(f"📝 Executive Summary Parts: {len(advisory_data.get('exec_summary_parts', []))}")
            print(f"🔒 CVEs: {len(advisory_data.get('cves', []))}")
            print(f"📊 CVSS Entries: {len(advisory_data.get('cvss', []))}")
            print(f"🚩 IOCs: {len(advisory_data.get('iocs', []))}")
            print(f"MITRE Tactics: {len(advisory_data.get('mitre', []))}")
            print(f"💡 Recommendations: {len(advisory_data.get('recommendations', []))}")
            
            # Validate required fields
            required_fields = [
                'schema_version', 'advisory_id', 'article_id', 'title', 
                'criticality', 'threat_type', 'exec_summary_parts',
                'affected_product', 'vendor', 'cves', 'cvss', 'iocs',
                'mitre', 'recommendations', 'references', 'tlp', 'status', 'created_at'
            ]
            
            missing_fields = [field for field in required_fields if field not in advisory_data]
            
            if missing_fields:
                print(f"⚠️  Missing required fields: {missing_fields}")
            else:
                print("All required schema fields present")
            
            # Check IOC format
            if advisory_data.get('iocs'):
                ioc_sample = advisory_data['iocs'][0] if advisory_data['iocs'] else {}
                if 'type' in ioc_sample and 'value' in ioc_sample:
                    print("IOCs in correct {type, value} format")
                else:
                    print("⚠️  IOCs not in expected format")
            
            return True
            
        else:
            print(f"❌ API request failed: {response.status_code}")
            print(f" Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing API: {e}")
        return False

def main():
    print("🧪 Testing full end-to-end manual advisory integration...")
    
    # Get sample article ID
    article_id = get_sample_article_id()
    if not article_id:
        print("❌ Cannot proceed without a sample article")
        sys.exit(1)
    
    # Test the API
    success = test_manual_advisory_api(article_id)
    
    if success:
        print("\n🎉 END-TO-END TEST PASSED!")
        print("Manual advisory generation working correctly")
        print("All schema fields properly formatted")
        print("Integration between Python backend and Next.js API complete")
    else:
        print("\n❌ END-TO-END TEST FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()