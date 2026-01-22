# Threat-Advisory Backend

Python backend for automated threat intelligence advisory generation.

## 📂 Structure

```
backend/
├── generate_advisories.py    # Main entry point for advisory generation
├── main.py                    # Helper functions and utilities
├── config.yaml                # Configuration (RSS feeds, LLM settings)
├── requirements.txt           # Python dependencies
├── collectors/                # RSS feed and data collection modules
│   ├── feeds.py              # RSS feed fetching
│   ├── cache.py              # Deduplication cache
│   ├── page.py               # Article content extraction
│   ├── mitre.py              # MITRE ATT&CK mapping
│   └── mitre_config.py       # MITRE configuration
├── llm/                      # LLM integration
│   └── summarize.py          # Hugging Face API calls
├── renderer/                 # HTML rendering
│   └── render.py             # Jinja2 template rendering
├── utils/                    # Utilities
│   └── common.py             # Common functions and logging
├── enrichment/               # Data enrichment
│   └── recommender.py        # Recommendation generation
├── templates/                # HTML templates for advisories
│   ├── advisory.html
│   ├── advisory_2.html
│   ├── advisory_3.html
│   └── advisory_4.html
├── workspace/                # Generated advisory files (HTML + JSON)
├── data/cache/               # Cached data (MITRE, etc.)
└── logs/                     # Log files
```

## 🚀 Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the `backend/` directory:

```env
# Hugging Face API Key (Required)
HF_API_KEY=your_hugging_face_api_key_here

# Optional: OpenAI API Key
OPENAI_API_KEY=your_openai_key_here

# Logging
LOG_LEVEL=INFO
```

### 3. Configure RSS Feeds

Edit `config.yaml` to customize:
- RSS feed sources
- LLM model (default: `meta-llama/Llama-3.1-8B-Instruct`)
- Max advisories per run
- TLP levels

## 🧪 Testing

### Test Advisory Generation

```bash
cd backend
python generate_advisories.py 1
```

This will:
1. Fetch the latest threat from RSS feeds
2. Analyze it using the LLM
3. Generate HTML + JSON advisory files
4. Output JSON to stdout

## 🔧 How It Works

### Called by API

The Next.js API route `/api/auto-feed` spawns this Python script:

```typescript
// pages/api/auto-feed.ts
const script = path.join(process.cwd(), 'backend', 'generate_advisories.py')
spawn(python, [script, '3'])
```

### Processing Flow

1. **Fetch RSS Feeds** → `collectors/feeds.py`
2. **Extract Article Content** → `collectors/page.py`
3. **LLM Analysis** → `llm/summarize.py` + `main.py`
4. **MITRE Mapping** → `collectors/mitre.py`
5. **Render HTML** → `renderer/render.py`
6. **Save Files** → `workspace/*.html` and `workspace/*.json`
7. **Return JSON** → stdout (parsed by auto-feed.ts)

### Output Format

```json
{
  "generated": [
    {
      "advisory_id": "SOC-TA-20260101-1200-01",
      "title": "Critical RCE Vulnerability",
      "html_path": "/full/path/to/advisory.html",
      "json_path": "/full/path/to/advisory.json",
      "criticality": "HIGH"
    }
  ]
}
```

## 📝 Configuration

### RSS Feed Sources

Edit `config.yaml` → `sources` → `rss`:

```yaml
sources:
  rss:
    - "https://thehackernews.com/feeds/posts/default"
    - "https://www.bleepingcomputer.com/feed/"
    # Add more feeds...
```

### LLM Model

Edit `config.yaml` → `huggingface`:

```yaml
huggingface:
  enabled: true
  model: "meta-llama/Llama-3.1-8B-Instruct"
```

### Max Advisories

Edit `config.yaml` → `report`:

```yaml
report:
  max_advisories_per_run: 3
  tlp: "AMBER"
  advisory_id_prefix: "SOC-TA"
```

## 🐛 Troubleshooting

### Module Not Found

```bash
pip install -r requirements.txt
```

### Encoding Errors (Windows)

The script automatically handles UTF-8 encoding on Windows.

### No New Items

Clear the cache:

```bash
rm workspace/seen_ids.json
```

### LLM Errors

Check your Hugging Face API key in `.env`:

```env
HF_API_KEY=hf_xxxxxxxxxxxxx
```

## 📊 Logs

Logs are written to stderr and optionally saved to `logs/`:

```bash
# View logs while running
python generate_advisories.py 3 2>&1 | tee logs/run.log
```

## 🔐 Security

- All logs go to stderr (not stdout)
- JSON output is ASCII-safe
- API keys stored in `.env` (not committed)
- Input validation and sanitization
- No shell injection vulnerabilities

## 📚 Dependencies

Main Python packages:
- `feedparser` - RSS feed parsing
- `beautifulsoup4` - HTML parsing
- `requests` - HTTP requests
- `jinja2` - Template rendering
- `PyYAML` - Configuration parsing
- `python-dateutil` - Date parsing

See `requirements.txt` for complete list.

---

**Location:** `C:\Threat-Advisory\backend\`
**Status:** Integrated
**Last Updated:** January 1, 2026
