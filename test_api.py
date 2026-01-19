import requests
import json

# Test the manual advisory generation API
def test_manual_advisory_api():
    url = "http://localhost:3000/api/manual-advisory/generate"
    
    # Get a sample article ID (you can replace this with any ID from your index)
    article_id = "7aeb1f247b3c4237fa0cff08febfcdc64a397f5b"
    
    payload = {
        "articleId": article_id
    }
    
    headers = {
        "Content-Type": "application/json",
        # Add admin authentication here if needed
        # "Authorization": "Bearer your_admin_token"
    }
    
    try:
        print(f"Testing API endpoint: {url}")
        print(f"Article ID: {article_id}")
        print("Sending request...")
        
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API call successful!")
            print(f"Success: {result.get('success', False)}")
            
            advisory = result.get('advisory', {})
            print(f"Advisory ID: {advisory.get('advisoryId', 'N/A')}")
            print(f"Title: {advisory.get('title', 'N/A')}")
            print(f"Criticality: {advisory.get('criticality', 'N/A')}")
            
            if 'note' in result:
                print(f"Note: {result['note']}")
                
        else:
            print(f"❌ API call failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection failed. Make sure the dev server is running on localhost:3000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_manual_advisory_api()