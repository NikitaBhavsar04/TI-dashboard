# Flask API - Quick Reference Card

## 🚀 Start Server
```powershell
cd C:\Threat-Advisory\backend\api
python app.py
```
**URL:** http://localhost:8000

---

## 📍 Endpoints Cheatsheet

### 1. Advisory Generation
```bash
POST /api/advisory/generate
Body: {"article_id": "your-article-id"}
```

### 2. List Feeds
```bash
GET /api/feeds/list
```

### 3. Extract IOCs
```bash
POST /api/iocs/extract-from-text
Body: {"text": "your text here"}
```

### 4. Database Health
```bash
GET /api/test_pipeline/db-health
```

### 5. Fetch Articles
```bash
POST /api/test_pipeline/fetch-feeds
```

### 6. List Raw Articles
```bash
GET /api/test_pipeline/list-raw-articles?limit=10&offset=0
```

### 7. List Advisories
```bash
GET /api/test_pipeline/list-advisories?limit=10&offset=0
```

### 8. Fetch & Store
```bash
POST /api/test_pipeline/fetch-and-store
Body: {"feed_urls": ["url1", "url2"]}
```

### 9. Generate from Text
```bash
POST /api/test_pipeline/generate-from-text
Body: {
  "article_id": "id",
  "title": "Title",
  "summary": "Summary",
  "article_url": "url",
  "source": "Source"
}
```

### 10. Store Advisory
```bash
POST /api/test_pipeline/store-advisory
Body: {complete advisory JSON}
```

---

## 🧪 Quick Tests

### Test with curl
```powershell
# Health check
curl http://localhost:8000/api/test_pipeline/db-health

# List feeds
curl http://localhost:8000/api/feeds/list

# Extract IOCs
curl -X POST http://localhost:8000/api/iocs/extract-from-text `
  -H "Content-Type: application/json" `
  -d '{\"text\":\"Malware at 192.168.1.1\"}'
```

### Test with Python
```python
import requests

# List advisories
response = requests.get('http://localhost:8000/api/test_pipeline/list-advisories?limit=5')
print(response.json())

# Generate advisory
data = {'article_id': 'your-id'}
response = requests.post('http://localhost:8000/api/advisory/generate', json=data)
print(response.json())
```

### Run Test Script
```powershell
cd C:\Threat-Advisory\backend\api
python test_endpoints.py
```

---

## 📦 Install Dependencies
```powershell
pip install flask flask-cors opensearch-py requests beautifulsoup4 feedparser python-dateutil pytest
```

---

## 🔍 Common Errors & Fixes

### ❌ ModuleNotFoundError: No module named 'flask_cors'
```powershell
pip install flask-cors
```

### ❌ Cannot connect to OpenSearch
- Check if OpenSearch is running
- Verify config.yaml host/port settings
- Check .env file for OPENSEARCH_HOST

### ❌ Import errors (utils, collectors, etc.)
- Fixed automatically by sys.path.insert in route files
- Make sure you're running from backend/api directory

---

## 📁 File Structure
```
backend/
├── api/
│   ├── app.py                 # ← Start this
│   ├── routes/
│   │   ├── advisory.py
│   │   ├── feeds.py
│   │   ├── iocs.py
│   │   └── test_pipeline.py
│   ├── README.md
│   └── test_endpoints.py
├── manual_advisory.py
├── collectors/
├── enrichment/
├── llm/
├── utils/
└── config.yaml
```

---

## 🎯 Next.js Integration Example

```javascript
// Fetch advisories
const getAdvisories = async () => {
  const res = await fetch('http://localhost:8000/api/test_pipeline/list-advisories?limit=10');
  return res.json();
};

// Generate advisory
const generateAdvisory = async (articleId) => {
  const res = await fetch('http://localhost:8000/api/advisory/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_id: articleId })
  });
  return res.json();
};

// Extract IOCs
const extractIOCs = async (text) => {
  const res = await fetch('http://localhost:8000/api/iocs/extract-from-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return res.json();
};
```

---

## ✅ Verification Checklist

- [ ] Flask server running on port 8000
- [ ] Can access http://localhost:8000/api/feeds/list
- [ ] OpenSearch connection works (db-health returns 200)
- [ ] Test script runs successfully
- [ ] Frontend can make requests to API

---

## 📞 Quick Links

- **Full Documentation:** `backend/api/README.md`
- **Integration Guide:** `FRONTEND_INTEGRATION_GUIDE.md`
- **Conversion Summary:** `FLASK-API-CONVERSION-SUMMARY.md`
- **Test Suite:** `backend/tests/test_api.py`

---

## 🎉 Ready to Go!

Your Flask API is fully operational and ready for Next.js frontend integration!

**Start coding your frontend and connect to these endpoints.** 🚀
