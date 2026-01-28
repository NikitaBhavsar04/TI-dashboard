# Threat Advisory Automation - Frontend Integration Guide

## Project Overview

This is a **Threat Advisory Automation System** built with:
- **Backend API:** Flask (Python) on `http://localhost:8000`
- **Database:** OpenSearch on `localhost:9200` (HTTP, no SSL - development mode)
- **Purpose:** Fetch security articles, extract IOCs, generate advisories using LLM, enrich with CVSS/MITRE/MBC data

---

## Architecture Summary

```
┌─────────────────┐
│   Next.js       │
│   Frontend      │
└────────┬────────┘
         │
    HTTP/REST
         │
    ┌────▼─────────────────┐
    │  Flask API Layer      │
    │  (Port 8000)          │
    │                       │
    │  - 10 Endpoints       │
    │  - Pipeline Flow      │
    │  - DB Operations      │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────┐
    │  OpenSearch (9200)    │
    │                       │
    │  - ti-raw-articles    │
    │  - ti-generated-      │
    │    advisories         │
    └───────────────────────┘
```

---

## 1. API Endpoints (Complete Reference)

### Base URL
```
http://localhost:8000
```

### A. Advisory Generation Endpoints

#### 1. Generate Advisory from Article ID
```http
POST /api/advisory/generate
Content-Type: application/json

{
  "article_id": "string (article ID from raw articles index)"
}
```

**Response (200 OK):**
```json
{
  "advisory": {
    "schema_version": "1.0",
    "advisory_id": "SOC-TA-20260127-103045",
    "article_id": "...",
    "incident_key": "...",
    "title": "Critical Apache Log4Shell Vulnerability Exploited in the Wild",
    "criticality": "HIGH",
    "threat_type": "Remote Code Execution",
    "exec_summary_parts": ["...", "..."],
    "affected_product": "Apache Log4j",
    "vendor": "Apache",
    "sectors": ["Technology", "Finance"],
    "regions": ["Global"],
    "cves": ["CVE-2021-44228"],
    "cvss": [
      {
        "cve": "CVE-2021-44228",
        "score": 10.0,
        "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "criticality": "CRITICAL",
        "source": "NVD"
      }
    ],
    "iocs": [
      {"type": "ipv4", "value": "192.168.1.1"},
      {"type": "domain", "value": "malicious.com"},
      {"type": "url", "value": "http://example.com/payload"},
      {"type": "md5", "value": "5d41402abc4b2a76b9719d911017c592"},
      {"type": "sha1", "value": "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d"},
      {"type": "sha256", "value": "2c26b46911185131006ba90e8e3a84637de8b1d76e81f3ce43617099afb17e7b"}
    ],
    "mitre": [
      {
        "technique": "T1190",
        "tactic": "Initial Access",
        "name": "Exploit Public-Facing Application"
      }
    ],
    "mbc": [
      "E1104 - Execution",
      "C0002 - Persistence"
    ],
    "recommendations": [
      "Update Apache Log4j to version 2.17.0 or later",
      "Apply network segmentation rules"
    ],
    "patch_details": ["..."],
    "references": ["https://article.url", "https://reference1.com"],
    "tlp": "AMBER",
    "status": "DRAFT",
    "created_at": "2026-01-27T10:30:45Z"
  }
}
```

**Errors (400/500):**
```json
{
  "error": "article_id is required"
}
```

---

### B. Feed Fetching Endpoints

#### 2. List Available Feeds
```http
GET /api/feeds/list
```

**Response (200 OK):**
```json
{
  "feeds": ["feed1_url", "feed2_url"],
  "count": 2
}
```

#### 3. Fetch Articles from All Feeds
```http
POST /api/test_pipeline/fetch-feeds
```

**Response (200 OK):**
```json
{
  "articles_fetched": 5,
  "articles": [
    {
      "id": "article-001",
      "title": "Security Breach Discovered",
      "summary": "...",
      "article_url": "https://...",
      "source": "SecurityNews",
      "article_text": "Full article content...",
      "nested_links": [],
      "cves": ["CVE-2026-1234"],
      "incident_key": null
    }
  ]
}
```

---

### C. IOC (Indicators of Compromise) Extraction

#### 4. Extract IOCs from Text
```http
POST /api/test_pipeline/extract-iocs-from-text
Content-Type: application/json

{
  "text": "Found malware at 192.168.1.1 connecting to malicious.com with hash 5d41402abc4b2a76b9719d911017c592"
}
```

**Response (200 OK):**
```json
{
  "iocs": {
    "ipv4": ["192.168.1.1"],
    "ipv6": [],
    "domains": ["malicious.com"],
    "urls": [],
    "md5": ["5d41402abc4b2a76b9719d911017c592"],
    "sha1": [],
    "sha256": []
  }
}
```

**IOC Types Extracted:**
- `ipv4` - IPv4 addresses
- `ipv6` - IPv6 addresses
- `domains` - Domain names
- `urls` - Full URLs
- `md5` - MD5 hashes
- `sha1` - SHA1 hashes
- `sha256` - SHA256 hashes

---

### D. Database Operations

#### 5. Database Health Check
```http
GET /api/test_pipeline/db-health
```

**Response (200 OK):**
```json
{
  "status": 200,
  "connected": true,
  "cluster": "running",
  "cluster_status": "green",
  "indices": ["ti-raw-articles", "ti-generated-advisories"]
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": 503,
  "error": "OpenSearch connection failed"
}
```

#### 6. Store Articles to Database
```http
POST /api/test_pipeline/fetch-and-store
Content-Type: application/json

{
  "feed_urls": ["https://feed1.com/rss", "https://feed2.com/rss"]
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "articles_fetched": 3,
  "articles_stored": 2,
  "message": "Articles stored in ti-raw-articles index"
}
```

#### 7. List Raw Articles from Database
```http
GET /api/test_pipeline/list-raw-articles?limit=10&offset=0
```

**Response (200 OK):**
```json
{
  "status": 200,
  "count": 10,
  "articles": [
    {
      "id": "article-001",
      "title": "...",
      "summary": "...",
      "source": "...",
      "created_at": "2026-01-27T10:00:00Z"
    }
  ]
}
```

#### 8. Generate Advisory and Store in Database
```http
POST /api/test_pipeline/generate-from-text
Content-Type: application/json

{
  "article_id": "article-001",
  "title": "Security Alert",
  "summary": "Brief summary of the alert",
  "article_url": "https://example.com/alert",
  "source": "SecurityNews"
}
```

**Response (200 OK):**
```json
{
  "status": 200,
  "advisory_id": "SOC-TA-20260127-103045",
  "title": "Security Alert",
  "criticality": "HIGH",
  "cves": ["CVE-2026-1234"],
  "stored": true
}
```

#### 9. Store Advisory Manually
```http
POST /api/test_pipeline/store-advisory
Content-Type: application/json

{
  "advisory_id": "SOC-TA-20260127-103045",
  "title": "Advisory Title",
  "criticality": "HIGH",
  "threat_type": "RCE",
  "cves": ["CVE-2026-1234"],
  "iocs": [{"type": "ipv4", "value": "192.168.1.1"}],
  "tlp": "AMBER"
}
```

**Response (201 Created):**
```json
{
  "status": 201,
  "message": "Advisory stored successfully",
  "advisory_id": "SOC-TA-20260127-103045"
}
```

#### 10. List Generated Advisories
```http
GET /api/test_pipeline/list-advisories?limit=10&offset=0
```

**Response (200 OK):**
```json
{
  "status": 200,
  "count": 5,
  "advisories": [
    {
      "advisory_id": "SOC-TA-20260127-103045",
      "title": "Critical Vulnerability Alert",
      "criticality": "HIGH",
      "created_at": "2026-01-27T10:30:45Z"
    }
  ]
}
```

---

## 2. Data Models & Schemas

### Raw Article Schema
```json
{
  "id": "unique-article-id",
  "title": "Article Title",
  "summary": "Brief summary",
  "article_url": "https://source.com/article",
  "article_text": "Full article content (up to 20000 chars)",
  "source": "SecurityNews | Reddit | Telegram",
  "nested_links": [
    {
      "url": "https://reference.com",
      "text": "Reference text"
    }
  ],
  "cves": ["CVE-2026-1234", "CVE-2026-5678"],
  "incident_key": "optional-incident-identifier",
  "created_at": "2026-01-27T10:00:00Z"
}
```

### Advisory Schema (Generated)
```json
{
  "schema_version": "1.0",
  "advisory_id": "SOC-TA-20260127-103045",
  "article_id": "unique-article-id",
  "incident_key": "optional-identifier",
  
  "title": "Advisory Title",
  "display_title": "Advisory Title",
  "criticality": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
  "threat_type": "Remote Code Execution | Privilege Escalation | ...",
  "exec_summary_parts": ["Part 1", "Part 2"],
  
  "affected_product": "Product Name",
  "vendor": "Vendor Name",
  "sectors": ["Technology", "Finance", "Healthcare"],
  "regions": ["Global", "North America", "Europe"],
  
  "cves": ["CVE-2026-1234"],
  "cvss": [
    {
      "cve": "CVE-2026-1234",
      "score": 9.8,
      "vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      "criticality": "CRITICAL",
      "source": "NVD"
    }
  ],
  
  "iocs": [
    {"type": "ipv4", "value": "192.168.1.1"},
    {"type": "domain", "value": "malicious.com"},
    {"type": "md5", "value": "5d41402abc4b2a76b9719d911017c592"}
  ],
  
  "mitre": [
    {
      "technique": "T1190",
      "tactic": "Initial Access",
      "name": "Exploit Public-Facing Application"
    }
  ],
  
  "mbc": ["E1104 - Execution", "C0002 - Persistence"],
  
  "recommendations": [
    "Update to version X.Y.Z",
    "Apply security patch",
    "Network segmentation"
  ],
  "patch_details": ["Patch information"],
  
  "references": ["https://article.url", "https://reference.com"],
  
  "tlp": "WHITE|GREEN|AMBER|RED",
  "status": "DRAFT|PUBLISHED|ARCHIVED",
  "created_at": "2026-01-27T10:30:45Z"
}
```

---

## 3. OpenSearch Database Structure

### Indices

#### ti-raw-articles
- **Purpose:** Store raw security articles fetched from feeds
- **Document Count:** 10+
- **Key Fields:** title, summary, article_url, source, cves, nested_links, article_text

#### ti-generated-advisories
- **Purpose:** Store generated threat advisories
- **Document Count:** 5+
- **Key Fields:** advisory_id, title, criticality, cves, cvss, iocs, mitre, mbc, recommendations

### Connection Details
```
Host: localhost
Port: 9200
Protocol: HTTP (development)
SSL: Disabled
Auth: None (development)
```

---

## 4. Testing & Validation

### Running Tests
```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run all tests
pytest tests/test_api.py -v

# Run specific test class
pytest tests/test_api.py::TestOpenSearchIntegration -v

# Run with short output
pytest tests/test_api.py --tb=short -q
```

### Test Results
- **Total Tests:** 16
- **Pass Rate:** 100%
- **Execution Time:** ~3-4 seconds
- **Test Classes:**
  - TestAdvisoryAPI (2 tests)
  - TestFeedsAPI (1 test)
  - TestIOCsAPI (7 tests) + TestPipelineFlow
  - TestOpenSearchIntegration (5 tests)
  - TestCompleteWorkflow (1 test)

---

## 5. Configuration

### config.yaml
```yaml
opensearch:
  host: "localhost"
  port: 9200
  use_ssl: false
  verify_certs: false
  raw_index: "ti-raw-articles"
  advisory_index: "ti-generated-advisories"

report:
  advisory_id_prefix: "SOC-TA"
  tlp: "AMBER"

feeds:
  urls:
    - "https://feed1.com/rss"
    - "https://feed2.com/rss"
```

### Environment Variables (Optional)
```
OPENSEARCH_HOST=localhost
OPENSEARCH_PORT=9200
OPENSEARCH_RAW_INDEX=ti-raw-articles
OPENSEARCH_ADVISORY_INDEX=ti-generated-advisories
```

---

## 6. Frontend Integration Checklist

### Prerequisites
- [ ] Flask API running on `http://localhost:8000`
- [ ] OpenSearch running on `localhost:9200`
- [ ] All 16 tests passing
- [ ] Database indices populated with sample data

### Integration Steps

#### Step 1: Dashboard/Article List Page
```
GET /api/test_pipeline/list-raw-articles?limit=20&offset=0
→ Display articles in table/list format
→ Add "Generate Advisory" button for each article
```

#### Step 2: Generate Advisory Button
```
On click, call:
POST /api/advisory/generate
{ "article_id": "selected-article-id" }
→ Show loading state
→ Display generated advisory modal/page
```

#### Step 3: Advisory Details Page
```
Display response data from Step 2:
- Title, Criticality (color-coded)
- CVEs with CVSS scores
- IOCs (IPv4, domains, hashes) - copy buttons
- MITRE ATT&CK tactics
- Recommendations
- TLP marking
- Created timestamp
```

#### Step 4: Advisory List/History
```
GET /api/test_pipeline/list-advisories?limit=20&offset=0
→ Display generated advisories history
→ Filter by criticality, date, CVE
→ Export/Print options
```

#### Step 5: IOC Search/Display
```
Extract IOCs from advisory:
- Separate by type
- Add copy-to-clipboard buttons
- Link to threat intelligence lookup (VirusTotal, AbuseIPDB, etc.)
```

#### Step 6: Health Monitoring
```
GET /api/test_pipeline/db-health
→ Display database connection status
→ Show number of articles/advisories in DB
→ Status indicator (green/yellow/red)
```

---

## 7. Code Files Location

### Backend API Files
```
api/
  ├── app.py                    # Main Flask application
  ├── routes/
  │   ├── advisory.py           # Advisory generation endpoint
  │   ├── feeds.py              # Feed listing endpoint
  │   ├── iocs.py               # IOC extraction endpoint
  │   └── test_pipeline.py      # 10 pipeline & DB endpoints ← USE THIS
  │
manual_advisory.py              # Core advisory generation logic
collectors/
  ├── feeds.py                  # Feed fetching logic
  ├── iocs.py                   # IOC extraction logic
  ├── mitre.py                  # MITRE mapping
  └── ...

enrichment/
  ├── cvss.py                   # CVSS score fetching
  ├── ioc.py                    # IOC enrichment
  └── ...

utils/
  ├── opensearch_client.py      # OpenSearch connection
  └── common.py                 # Utilities

llm/
  ├── opensummarize.py          # LLM summarization
  ├── mbc.py                    # MBC extraction
  └── ...
```

### Test Files
```
tests/
  └── test_api.py               # All 16 tests
```

---

## 8. Error Handling & Status Codes

### Success Responses
- `200 OK` - Successful GET/POST operations
- `201 Created` - Resource created (advisory stored)

### Client Errors
- `400 Bad Request` - Missing/invalid parameters
- `404 Not Found` - Resource not found

### Server Errors
- `500 Internal Server Error` - Exception during processing
- `503 Service Unavailable` - OpenSearch connection failed

### Error Response Format
```json
{
  "error": "Description of what went wrong",
  "status": 400
}
```

---

## 9. Performance & Optimization

### Current Performance
- Advisory generation: ~2-5 seconds (depends on LLM response time)
- Database queries: <500ms
- IOC extraction: <1 second
- Full pipeline: ~10-15 seconds

### Optimization Tips for Frontend
1. **Show Loading States:** Advisory generation takes 2-5 seconds
2. **Pagination:** Use limit/offset for large datasets
3. **Caching:** Cache advisories after generation
4. **Batch Operations:** Generate advisories for multiple articles if needed

---

## 10. Future Enhancements

### Planned Features
1. Scheduled feed fetching (every 6 hours)
2. Real-time advisory notifications (WebSocket)
3. Advisory publishing workflow (DRAFT → PUBLISHED)
4. User authentication & authorization
5. Audit logging
6. Advisory search/filtering
7. Export to STIX/CSV
8. Integration with SIEM systems

---

## 11. Quick Start for Frontend Developer

### 1. Start Flask API
```powershell
cd c:\Threat-Advisory\backend
.\venv\Scripts\Activate.ps1
python api/app.py
```

### 2. Verify OpenSearch
```bash
curl http://localhost:9200/_cluster/health
# Should return: {"status":"green",...}
```

### 3. Test API
```bash
# Get raw articles
curl http://localhost:8000/api/test_pipeline/list-raw-articles

# Generate advisory (need valid article_id)
curl -X POST http://localhost:8000/api/advisory/generate \
  -H "Content-Type: application/json" \
  -d '{"article_id": "article-001"}'
```

### 4. Build Frontend
```bash
# Next.js app
npx create-next-app@latest threat-advisory-frontend
cd threat-advisory-frontend
npm run dev
# Frontend runs on http://localhost:3000
```

### 5. Call API from Next.js
```javascript
// pages/advisories.jsx
const fetchAdvisories = async () => {
  const response = await fetch('http://localhost:8000/api/test_pipeline/list-advisories');
  const data = await response.json();
  return data;
};

const generateAdvisory = async (articleId) => {
  const response = await fetch('http://localhost:8000/api/advisory/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_id: articleId })
  });
  return response.json();
};
```

---

## 12. Environment Details

### Current Setup
- **Python Version:** 3.10.8
- **Flask Version:** 2.x
- **OpenSearch Version:** Compatible with opensearch-py
- **Database:** OpenSearch on localhost:9200 (HTTP, no SSL)
- **Port (Flask API):** 8000

### Virtual Environment
```
Location: D:\FCT\ThreatAdvisory-Automation-backend\venv
Activate: .\venv\Scripts\Activate.ps1
```

---

## Summary

This Flask API provides a complete threat advisory generation pipeline with:
- ✅ 10 functional endpoints
- ✅ Database integration (OpenSearch)
- ✅ IOC extraction (7 types)
- ✅ CVSS/MITRE/MBC enrichment
- ✅ LLM-powered summarization
- ✅ 16-test validation suite (100% passing)
- ✅ Production-ready error handling

**Next Step:** Connect Next.js frontend to these endpoints following the integration checklist above.

