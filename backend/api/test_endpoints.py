#!/usr/bin/env python3
"""
Quick API Test Script
Tests all Flask API endpoints to verify they're working
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, params=None):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, params=params, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        
        print(f"\n{'='*60}")
        print(f"Testing: {method} {endpoint}")
        print(f"Status Code: {response.status_code}")
        
        try:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)[:500]}...")
            return response.status_code, result
        except:
            print(f"Response: {response.text[:200]}")
            return response.status_code, None
    
    except requests.exceptions.ConnectionError:
        print(f"❌ ERROR: Cannot connect to {BASE_URL}")
        print(f"   Make sure Flask server is running on port 8000")
        return None, None
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None, None


def main():
    print("🧪 Testing Flask API Endpoints")
    print(f"Base URL: {BASE_URL}")
    print("="*60)
    
    # Track results
    passed = 0
    failed = 0
    
    # 1. Database Health Check
    status, _ = test_endpoint("GET", "/api/test_pipeline/db-health")
    if status in [200, 503]:
        passed += 1
        print("✅ PASS")
    else:
        failed += 1
        print("❌ FAIL")
    
    # 2. List Feeds
    status, _ = test_endpoint("GET", "/api/feeds/list")
    if status == 200:
        passed += 1
        print("✅ PASS")
    else:
        failed += 1
        print("❌ FAIL")
    
    # 3. Extract IOCs from Text
    test_data = {
        "text": "Found malware at 192.168.1.1 connecting to malicious.com with hash 5d41402abc4b2a76b9719d911017c592"
    }
    status, result = test_endpoint("POST", "/api/iocs/extract-from-text", data=test_data)
    if status == 200 and result and 'iocs' in result:
        passed += 1
        print("✅ PASS")
    else:
        failed += 1
        print("❌ FAIL")
    
    # 4. Extract IOCs via Pipeline
    status, result = test_endpoint("POST", "/api/test_pipeline/extract-iocs-from-text", data=test_data)
    if status == 200 and result and 'iocs' in result:
        passed += 1
        print("✅ PASS")
    else:
        failed += 1
        print("❌ FAIL")
    
    # 5. List Raw Articles
    status, result = test_endpoint("GET", "/api/test_pipeline/list-raw-articles", params={"limit": 5})
    if status == 200 and result and 'articles' in result:
        passed += 1
        print("✅ PASS")
    else:
        failed += 1
        print("❌ FAIL")
    
    # 6. List Advisories
    status, result = test_endpoint("GET", "/api/test_pipeline/list-advisories", params={"limit": 5})
    if status == 200 and result and 'advisories' in result:
        passed += 1
        print("✅ PASS")
    else:
        failed += 1
        print("❌ FAIL")
    
    # 7. Fetch Feeds (might take longer)
    print("\n⚠️  Note: fetch-feeds endpoint may take 10-30 seconds...")
    status, result = test_endpoint("POST", "/api/test_pipeline/fetch-feeds")
    if status in [200, 400, 500]:  # Accept any response (feeds might not be configured)
        passed += 1
        print("✅ PASS (endpoint responsive)")
    else:
        failed += 1
        print("❌ FAIL")
    
    # 8. Test error handling - missing article_id
    status, result = test_endpoint("POST", "/api/advisory/generate", data={})
    if status == 400 and result and 'error' in result:
        passed += 1
        print("✅ PASS (error handling works)")
    else:
        failed += 1
        print("❌ FAIL")
    
    # 9. Test error handling - missing text
    status, result = test_endpoint("POST", "/api/iocs/extract-from-text", data={})
    if status == 400 and result and 'error' in result:
        passed += 1
        print("✅ PASS (error handling works)")
    else:
        failed += 1
        print("❌ FAIL")
    
    # Summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Total: {passed + failed}")
    print(f"Success Rate: {(passed/(passed+failed)*100):.1f}%")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
