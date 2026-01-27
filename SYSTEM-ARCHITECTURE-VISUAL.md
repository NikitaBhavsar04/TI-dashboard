# System Architecture - Visual Guide

## Complete Data Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│                         USER / SOC ANALYST                                │
│                    (Using Web Browser / Frontend)                         │
│                                                                           │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 │ HTTP Requests
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                         NEXT.JS FRONTEND                                │
│                      (http://localhost:3000)                            │
│                                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  Dashboard  │  │   Advisory   │  │  Article   │  │    IOC       │  │
│  │    Page     │  │     List     │  │   List     │  │   Viewer     │  │
│  └─────────────┘  └──────────────┘  └────────────┘  └──────────────┘  │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ REST API Calls
                                 │ JSON Requests/Responses
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                      FLASK API LAYER (Port 8000)                        │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                          app.py                                   │  │
│  │  - Flask Application with CORS                                    │  │
│  │  - Auto-discovers and registers all route blueprints             │  │
│  │  - Error handling and logging                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ROUTE BLUEPRINTS                               │  │
│  │                                                                    │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │  │
│  │  │ advisory.py    │  │  feeds.py      │  │  iocs.py       │      │  │
│  │  │                │  │                │  │                │      │  │
│  │  │ /generate      │  │ /list          │  │ /extract-from- │      │  │
│  │  │                │  │                │  │  text          │      │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘      │  │
│  │                                                                    │  │
│  │  ┌──────────────────────────────────────────────────────────┐    │  │
│  │  │              test_pipeline.py                             │    │  │
│  │  │                                                            │    │  │
│  │  │  /db-health          /list-raw-articles                   │    │  │
│  │  │  /fetch-feeds        /generate-from-text                  │    │  │
│  │  │  /fetch-and-store    /store-advisory                      │    │  │
│  │  │  /extract-iocs       /list-advisories                     │    │  │
│  │  └──────────────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────┬──────────────────┬─────────────────────────────┘
                         │                  │
                         │                  │
        ┌────────────────▼───────┐   ┌──────▼─────────────────┐
        │                        │   │                        │
        │  BACKEND CORE LOGIC    │   │  EXTERNAL SERVICES     │
        │                        │   │                        │
        └────────────────────────┘   └────────────────────────┘
                  │                             │
                  │                             │
     ┌────────────┴──────────┐         ┌───────┴────────┐
     │                       │         │                │
     ▼                       ▼         ▼                ▼
┌─────────────┐      ┌──────────┐   ┌──────┐      ┌────────┐
│ manual_     │      │collectors│   │ NVD  │      │ MITRE  │
│ advisory.py │      │  - feeds │   │ API  │      │ ATT&CK │
│             │      │  - iocs  │   │      │      │        │
│ Generate    │      │  - page  │   │CVSS  │      │Tactics │
│ Complete    │      │  - mitre │   │Scores│      │        │
│ Advisory    │      └──────────┘   └──────┘      └────────┘
│             │             │
└──────┬──────┘             │
       │                    │
       │      ┌─────────────▼────────┐
       │      │   enrichment/        │
       │      │   - cvss.py          │
       └──────┤   - ioc.py           │
              │   - recommender.py   │
              └──────────────────────┘
                        │
              ┌─────────▼──────────┐
              │      llm/          │
              │  - opensummarize   │
              │  - mbc.py          │
              │                    │
              │  LLM Integration   │
              │  (OpenAI/Ollama)   │
              └────────────────────┘
                        │
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    OPENSEARCH DATABASE                                  │
│                   (localhost:9200 or AWS)                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  INDEX: ti-raw-articles                                           │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                       │  │
│  │  - id                  (unique article ID)                        │  │
│  │  - title               (article headline)                         │  │
│  │  - summary             (brief description)                        │  │
│  │  - article_url         (source URL)                               │  │
│  │  - article_text        (full content, max 20000 chars)            │  │
│  │  - source              (SecurityNews/Reddit/Telegram)             │  │
│  │  - cves                (list of CVE IDs)                          │  │
│  │  - nested_links        (related URLs)                             │  │
│  │  - created_at          (timestamp)                                │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                   │  │
│  │  INDEX: ti-generated-advisories                                   │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                 │  │
│  │  - advisory_id         (SOC-TA-YYYYMMDD-HHMMSS)                   │  │
│  │  - article_id          (reference to raw article)                 │  │
│  │  - title               (advisory title)                           │  │
│  │  - criticality         (CRITICAL/HIGH/MEDIUM/LOW/INFO)            │  │
│  │  - threat_type         (RCE, Privilege Escalation, etc.)          │  │
│  │  - exec_summary_parts  (executive summary paragraphs)             │  │
│  │  - affected_product    (product name)                             │  │
│  │  - vendor              (vendor name)                              │  │
│  │  - sectors             (affected industries)                      │  │
│  │  - regions             (affected regions)                         │  │
│  │  - cves                (CVE IDs)                                  │  │
│  │  - cvss                (CVSS scores with vectors)                 │  │
│  │  - iocs                (IPv4, domains, hashes, URLs)              │  │
│  │  - mitre               (MITRE ATT&CK techniques)                  │  │
│  │  - mbc                 (Malware Behavior Catalog)                 │  │
│  │  - recommendations     (remediation steps)                        │  │
│  │  - patch_details       (patch information)                        │  │
│  │  - references          (source URLs)                              │  │
│  │  - tlp                 (WHITE/GREEN/AMBER/RED)                    │  │
│  │  - status              (DRAFT/PUBLISHED/ARCHIVED)                 │  │
│  │  - created_at          (timestamp)                                │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Request Flow Examples

### Example 1: Generate Advisory from Article

```
USER                    FRONTEND                    FLASK API                BACKEND              DATABASE
  │                        │                            │                        │                    │
  │  Click "Generate       │                            │                        │                    │
  │   Advisory" Button     │                            │                        │                    │
  ├───────────────────────>│                            │                        │                    │
  │                        │  POST /api/advisory/       │                        │                    │
  │                        │       generate             │                        │                    │
  │                        ├───────────────────────────>│                        │                    │
  │                        │  {"article_id": "abc123"}  │  Call manual_advisory  │                    │
  │                        │                            ├───────────────────────>│                    │
  │                        │                            │  .generate_advisory()  │                    │
  │                        │                            │                        │  Load raw article  │
  │                        │                            │                        ├───────────────────>│
  │                        │                            │                        │<───────────────────┤
  │                        │                            │                        │  Article data      │
  │                        │                            │                        │                    │
  │                        │                            │                        │  Fetch CVSS (NVD)  │
  │                        │                            │                        ├────────────> [NVD] │
  │                        │                            │                        │<────────────       │
  │                        │                            │                        │                    │
  │                        │                            │                        │  Map MITRE ATT&CK  │
  │                        │                            │                        ├──────────> [MITRE] │
  │                        │                            │                        │<──────────         │
  │                        │                            │                        │                    │
  │                        │                            │                        │  LLM Summarize     │
  │                        │                            │                        ├─────────> [OpenAI] │
  │                        │                            │                        │<─────────          │
  │                        │                            │                        │                    │
  │                        │                            │                        │  Save advisory     │
  │                        │                            │                        ├───────────────────>│
  │                        │                            │<───────────────────────┤                    │
  │                        │                            │  Advisory JSON         │                    │
  │                        │<───────────────────────────┤                        │                    │
  │                        │  {"advisory": {...}}       │                        │                    │
  │<───────────────────────┤                            │                        │                    │
  │  Display Advisory      │                            │                        │                    │
  │                        │                            │                        │                    │
```

### Example 2: Fetch and Store Articles

```
CRON JOB              FLASK API             collectors/feeds.py        DATABASE
   │                      │                         │                      │
   │  POST /fetch-        │                         │                      │
   │   and-store          │                         │                      │
   ├─────────────────────>│  Call fetch_rss()       │                      │
   │                      ├────────────────────────>│                      │
   │                      │                         │  Fetch RSS Feed 1    │
   │                      │                         ├───────────> [RSS]    │
   │                      │                         │<───────────          │
   │                      │                         │  Fetch RSS Feed 2    │
   │                      │                         ├───────────> [RSS]    │
   │                      │                         │<───────────          │
   │                      │                         │                      │
   │                      │                         │  Score & Filter      │
   │                      │                         │  Articles            │
   │                      │<────────────────────────┤                      │
   │                      │  List of articles       │                      │
   │                      │                         │                      │
   │                      │  For each article:      │                      │
   │                      │  - Fetch full text      │                      │
   │                      │  - Store in DB          │                      │
   │                      ├─────────────────────────┼─────────────────────>│
   │                      │                         │  index(article)      │
   │<─────────────────────┤                         │                      │
   │  {"articles_stored": │                         │                      │
   │   10}                │                         │                      │
   │                      │                         │                      │
```

## Technology Stack

```
┌───────────────────────────────────────────────────────────────┐
│                        FRONTEND                               │
│  - Next.js 14+                                                │
│  - React 18+                                                  │
│  - TypeScript                                                 │
│  - Tailwind CSS                                               │
│  - Axios / Fetch API                                          │
└───────────────────────────────────────────────────────────────┘
                              ↕
┌───────────────────────────────────────────────────────────────┐
│                      API LAYER                                │
│  - Flask 3.x                                                  │
│  - Flask-CORS                                                 │
│  - Python 3.10+                                               │
└───────────────────────────────────────────────────────────────┘
                              ↕
┌───────────────────────────────────────────────────────────────┐
│                   BACKEND SERVICES                            │
│  - Python 3.10+                                               │
│  - OpenSearch-py (database client)                            │
│  - Requests (HTTP client)                                     │
│  - BeautifulSoup4 (HTML parsing)                              │
│  - Feedparser (RSS parsing)                                   │
│  - OpenAI / Ollama (LLM integration)                          │
└───────────────────────────────────────────────────────────────┘
                              ↕
┌───────────────────────────────────────────────────────────────┐
│                       DATABASE                                │
│  - OpenSearch 2.x                                             │
│  - Elasticsearch-compatible                                   │
│  - JSON document store                                        │
└───────────────────────────────────────────────────────────────┘
                              ↕
┌───────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                           │
│  - NVD API (CVSS scores)                                      │
│  - MITRE ATT&CK (tactics/techniques)                          │
│  - RSS Feeds (security news)                                  │
│  - LLM API (OpenAI/Ollama)                                    │
└───────────────────────────────────────────────────────────────┘
```

## Port Mapping

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Next.js Frontend | 3000 | HTTP | Web UI |
| Flask API | 8000 | HTTP | REST API |
| OpenSearch | 9200 | HTTP/HTTPS | Database |
| OpenSearch Dashboard | 5601 | HTTP | DB Management (optional) |

## Security Layers

```
┌─────────────────────────────────────────────────────┐
│  TLP Marking (WHITE/GREEN/AMBER/RED)                │
│  - Controls information sharing                      │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  CORS Configuration                                  │
│  - Controls frontend access                          │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  API Authentication (Future)                         │
│  - JWT tokens or API keys                            │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Database Access Control                             │
│  - OpenSearch authentication                         │
│  - SSL/TLS for remote connections                    │
└─────────────────────────────────────────────────────┘
```

## Deployment Options

### Development (Current)
```
Local Machine
├── Flask API (localhost:8000)
├── OpenSearch (localhost:9200)
└── Next.js (localhost:3000)
```

### Production (Future)
```
AWS / Cloud
├── EC2 / ECS (Flask API)
├── OpenSearch Service (managed)
├── Vercel / Amplify (Next.js)
└── CloudFront (CDN)
```

---

This visual guide provides a comprehensive overview of how all components work together in the Threat Advisory Automation System!
