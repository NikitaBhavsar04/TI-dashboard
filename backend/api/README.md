# Flask API Backend - Quick Start Guide

## 🚀 Overview

This is the Flask API layer for the Threat Advisory Automation System. It provides REST endpoints for the Next.js frontend to interact with the backend Python services.

## 📋 Architecture

```
Flask API (Port 8000)
├── /api/advisory/generate         - Generate advisory from article ID
├── /api/feeds/list                - List RSS feed URLs
├── /api/iocs/extract-from-text    - Extract IOCs from text
└── /api/test_pipeline/*           - Pipeline & DB operations
    ├── db-health                  - Database health check
    ├── fetch-feeds                - Fetch RSS articles
    ├── extract-iocs-from-text     - Extract IOCs
    ├── fetch-and-store            - Fetch & store articles
    ├── list-raw-articles          - List raw articles
    ├── generate-from-text         - Generate advisory from text
    ├── store-advisory             - Store advisory manually
    └── list-advisories            - List generated advisories
```

## 🏃 Quick Start

### 1. Start the API Server

```powershell
cd C:\Threat-Advisory\backend\api
python app.py
```

Server runs on: **http://localhost:8000**

### 2. Test Health Check

```powershell
curl http://localhost:8000/api/test_pipeline/db-health
```

### 3. List Feeds

```powershell
curl http://localhost:8000/api/feeds/list
```

### 4. Extract IOCs from Text

```powershell
curl -X POST http://localhost:8000/api/iocs/extract-from-text `
  -H "Content-Type: application/json" `
  -d '{"text":"Found malware at 192.168.1.1"}'
```

### 5. Generate Advisory

```powershell
curl -X POST http://localhost:8000/api/advisory/generate `
  -H "Content-Type: application/json" `
  -d '{"article_id":"your-article-id"}'
```

## 📦 Dependencies

Install required packages:

```powershell
pip install flask flask-cors opensearch-py requests beautifulsoup4 feedparser python-dateutil
```

## 🧪 Run Tests

```powershell
cd C:\Threat-Advisory\backend
pytest tests/test_api.py -v
```

## 🔧 Configuration

Edit `backend/config.yaml`:

```yaml
opensearch:
  host: "localhost"
  port: 9200
  use_ssl: false
  raw_index: "ti-raw-articles"
  advisory_index: "ti-generated-advisories"

feeds:
  urls:
    - "https://feed1.com/rss"
    - "https://feed2.com/rss"
```

## 🌐 API Endpoints Reference

### 1. Generate Advisory

**POST** `/api/advisory/generate`

```json
Request:
{
  "article_id": "article-001"
}

Response (200):
{
  "advisory": {
    "advisory_id": "SOC-TA-20260127-103045",
    "title": "Critical Vulnerability Alert",
    "criticality": "HIGH",
    "cves": ["CVE-2026-1234"],
    "cvss": [...],
    "iocs": [...],
    "mitre": [...],
    ...
  }
}
```

### 2. List Feeds

**GET** `/api/feeds/list`

```json
Response (200):
{
  "feeds": ["https://feed1.com", "https://feed2.com"],
  "count": 2
}
```

### 3. Extract IOCs

**POST** `/api/iocs/extract-from-text`

```json
Request:
{
  "text": "Malware at 192.168.1.1 with hash abc123..."
}

Response (200):
{
  "iocs": {
    "ipv4": ["192.168.1.1"],
    "domains": ["evil.com"],
    "md5": ["abc123..."],
    ...
  }
}
```

### 4. Database Health

**GET** `/api/test_pipeline/db-health`

```json
Response (200):
{
  "status": 200,
  "connected": true,
  "cluster_status": "green",
  "indices": ["ti-raw-articles", "ti-generated-advisories"]
}
```

### 5. Fetch Articles

**POST** `/api/test_pipeline/fetch-feeds`

```json
Response (200):
{
  "articles_fetched": 5,
  "articles": [...]
}
```

### 6. List Raw Articles

**GET** `/api/test_pipeline/list-raw-articles?limit=10&offset=0`

```json
Response (200):
{
  "status": 200,
  "count": 10,
  "articles": [...]
}
```

### 7. Store & Fetch Articles

**POST** `/api/test_pipeline/fetch-and-store`

```json
Request:
{
  "feed_urls": ["https://feed1.com", "https://feed2.com"]
}

Response (200):
{
  "status": 200,
  "articles_fetched": 3,
  "articles_stored": 2,
  "message": "Articles stored in ti-raw-articles index"
}
```

### 8. Generate from Text

**POST** `/api/test_pipeline/generate-from-text`

```json
Request:
{
  "article_id": "article-001",
  "title": "Security Alert",
  "summary": "Brief summary",
  "article_url": "https://example.com",
  "source": "SecurityNews"
}

Response (200):
{
  "status": 200,
  "advisory_id": "SOC-TA-20260127-103045",
  "title": "Security Alert",
  "criticality": "HIGH",
  "cves": [...],
  "stored": true
}
```

### 9. Store Advisory

**POST** `/api/test_pipeline/store-advisory`

```json
Request:
{
  "advisory_id": "SOC-TA-20260127-103045",
  "title": "Advisory Title",
  "criticality": "HIGH",
  ...
}

Response (201):
{
  "status": 201,
  "message": "Advisory stored successfully",
  "advisory_id": "SOC-TA-20260127-103045"
}
```

### 10. List Advisories

**GET** `/api/test_pipeline/list-advisories?limit=10&offset=0`

```json
Response (200):
{
  "status": 200,
  "count": 5,
  "advisories": [...]
}
```

## 🐛 Troubleshooting

### ModuleNotFoundError

```powershell
# Install missing modules
pip install flask flask-cors opensearch-py
```

### Import Path Issues

The routes automatically add the backend directory to `sys.path`:
```python
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
```

### OpenSearch Connection

- **localhost**: Uses HTTP (no SSL)
- **Remote**: Uses HTTPS with SSL

Check connection:
```python
from utils.opensearch_client import get_opensearch_client
client = get_opensearch_client()
print(client.ping())  # Should return True
```

## 📂 File Structure

```
backend/
├── api/
│   ├── app.py                    # Main Flask app
│   └── routes/
│       ├── advisory.py           # Advisory generation
│       ├── feeds.py              # Feed listing
│       ├── iocs.py               # IOC extraction
│       └── test_pipeline.py      # Pipeline operations
├── manual_advisory.py            # Advisory generation logic
├── collectors/
│   ├── feeds.py                  # RSS feed fetching
│   ├── iocs.py                   # IOC extraction
│   ├── page.py                   # Web page fetching
│   └── mitre.py                  # MITRE mapping
├── enrichment/
│   ├── cvss.py                   # CVSS scoring
│   └── ioc.py                    # IOC enrichment
├── llm/
│   ├── opensummarize.py          # LLM summarization
│   └── mbc.py                    # MBC extraction
├── utils/
│   ├── opensearch_client.py      # OpenSearch connection
│   └── common.py                 # Common utilities
└── tests/
    └── test_api.py               # API tests
```

## 🎯 Next Steps

1. **Frontend Integration**: Connect Next.js to these endpoints
2. **Authentication**: Add JWT/API key authentication
3. **Rate Limiting**: Implement rate limiting for production
4. **Logging**: Enhanced logging with request IDs
5. **Documentation**: API documentation with Swagger/OpenAPI

## 📝 Notes

- Development server runs on port 8000
- CORS is enabled for all origins (development mode)
- All routes use JSON for request/response
- Error responses include descriptive error messages
- Database operations require OpenSearch to be running

## 🔗 Related Documentation

- Full Integration Guide: `FRONTEND_INTEGRATION_GUIDE.md`
- Backend README: `BACKEND-README.md`
- Deployment Guide: `DEPLOYMENT.md`
