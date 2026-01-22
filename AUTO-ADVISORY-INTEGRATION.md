# 🤖 Auto Advisory Integration Guide

## Overview

The **Auto Advisory** feature automatically generates professional threat intelligence advisories by integrating the ThreatAdvisory-Automation system with the Threat-Advisory web platform. It fetches threat intelligence from RSS feeds, analyzes them using AI, and creates fully formatted advisories matching your manual advisory format.

## Features

- **Automatic Threat Collection**: Monitors 50+ RSS feeds from major security vendors and researchers
- **AI-Powered Analysis**: Uses Hugging Face LLM to analyze and structure threat intelligence
- **Professional Formatting**: Generates advisories with the same format as manual entries (like "AI-Specific Attack Vectors")
- **MongoDB Integration**: Automatically saves generated advisories to your database
- **MITRE ATT&CK Mapping**: Includes relevant tactics and techniques
- **CVE Tracking**: Extracts and tracks CVE identifiers
- **Executive Summaries**: Generates structured 3-paragraph executive summaries
- **Actionable Recommendations**: Provides SOC-ready mitigation steps

## 📋 Prerequisites

### 1. ThreatAdvisory-Automation Setup

The automation system must be located at one of these paths:
- `C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation` (current setup)
- `../ThreatAdvisory-Automation` (relative to Threat-Advisory)
- `../../ThreatAdvisory-Automation` (relative to Threat-Advisory)

### 2. Python Environment

Ensure Python 3.8+ is installed with required dependencies:

```bash
cd C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
pip install -r requirements.txt
```

### 3. Configuration File

Verify `config.yaml` exists in ThreatAdvisory-Automation with:
- RSS feed sources configured
- LLM settings (Hugging Face: `meta-llama/Llama-3.1-8B-Instruct` or Ollama)
- Workspace directory set
- `max_advisories_per_run: 3` in report section

### 4. Environment Variables (Optional)

Add to `.env.local` in Threat-Advisory:

```env
# Python path (if not in system PATH)
PYTHON_PATH=python

# Or specify custom automation path
AUTOMATION_PATH=C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
```

## 🚀 How It Works

### Architecture Flow

```
┌─────────────────────┐
│   RSS Feeds         │
│  (50+ sources)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ThreatAdvisory      │
│ Automation          │
│ - Fetch articles    │
│ - Parse content     │
│ - LLM analysis      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Advisory           │
│  Generation         │
│ - JSON + HTML       │
│ - MITRE mapping     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Next.js API        │
│  /api/auto-feed     │
│ - Parse output      │
│ - Save to MongoDB   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Advisory Database  │
│  (MongoDB)          │
└─────────────────────┘
```

### Data Flow

1. **Collection Phase**
   - Python script fetches RSS feeds from 50+ security sources
   - Filters relevant threat intelligence using keywords and CVE patterns
   - Checks against seen items cache to avoid duplicates

2. **Analysis Phase**
   - Extracts full article content from source URLs
   - Builds structured prompt for LLM analysis
   - LLM generates JSON with advisory details:
     - Title, affected product, vendor
     - Criticality level
     - Executive summary (3 paragraphs)
     - CVEs, recommendations, patch details
     - MITRE ATT&CK tactics

3. **Rendering Phase**
   - Renders HTML using professional template
   - Applies cyber-security themed styling
   - Saves both HTML and JSON files

4. **Integration Phase**
   - Next.js API endpoint receives generated data
   - Maps fields to MongoDB Advisory schema
   - Saves to database with proper metadata
   - Refreshes UI to display new advisories

## 🎮 Usage

### From Web Interface

1. **Login as Admin**
   - Email: `admin@threatwatch.com`
   - Password: `admin123`

2. **Navigate to Advisories**
   - Click "Advisories" in the navigation menu
   - Or go to: `http://localhost:3000/advisories`

3. **Click "Auto Advisory" Button**
   - Green button with lightning icon (⚡)
   - Located in the top action bar
   - Button shows "Generating..." while processing

4. **Wait for Generation**
   - Process takes 30-90 seconds
   - Automatically generates up to 3 advisories (configurable in config.yaml)
   - Page reloads to show new advisories

### From API (Programmatic)

```bash
# POST request with authentication
curl -X POST http://localhost:3000/api/auto-feed \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_JWT_TOKEN" \
  -d '{"maxItems": 3}'
```

### From Command Line (Direct)

```bash
cd C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
python generate_advisories_api.py 3
```

## 📊 Generated Advisory Format

Each auto-generated advisory includes:

### Basic Information
- **Advisory ID**: `SOC-TA-YYYYMMDD-HHMM-NN`
- **Title**: Concise threat name
- **Severity**: Critical/High/Medium/Low
- **Category**: Threat type classification
- **TLP**: Traffic Light Protocol level

### Content Sections
- **Executive Summary**: 3-paragraph structured analysis
  - Paragraph 1: High-level overview
  - Paragraph 2: Technical details (8-9 sentences)
  - Paragraph 3: Impact and affected parties

- **Affected Products**: Software/hardware impacted
- **Vendor**: Product manufacturer/maintainer
- **CVE IDs**: Associated vulnerability identifiers
- **MITRE ATT&CK**: Mapped tactics and techniques

### Actionable Intelligence
- **Recommendations**: SOC-ready mitigation steps
- **Patch Details**: Update/fix information
- **References**: Source links
- **Target Sectors**: Affected industries
- **Regions**: Geographic scope (if specified)

## ⚙️ Configuration

### Adjusting Generation Count

Modify the API call to generate more/fewer advisories:

```typescript
// In pages/advisories/index.tsx
const handleAutoFeed = async () => {
  // Change maxItems: 3 to desired number
  const resp = await fetch('/api/auto-feed', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ maxItems: 5 }) // Generate 5 advisories
  });
  // ...
};
```

### RSS Feed Sources

Edit `config.yaml` to add/remove RSS sources:

```yaml
sources:
  rss:
    - "https://your-security-blog.com/feed/"
    - "https://another-source.com/rss"
```

### LLM Configuration

Choose your AI model in `config.yaml`:

```yaml
# Option 1: Hugging Face (Default)
huggingface:
  enabled: true
  model: "fdtn-ai/Foundation-Sec-1.1-8B-Instruct"

# Option 2: Local Ollama
ollama:
  enabled: true
  host: "http://localhost:11434"
  model: "llama3:latest"
```

### Filtering Keywords

Customize threat intelligence filtering:

```yaml
filters:
  keywords: 
    - "vulnerability"
    - "exploit"
    - "zero-day"
    # Add your keywords
```

## 🔧 Troubleshooting

### Error: "Automation script not found"

**Solution**: Verify ThreatAdvisory-Automation location:
```bash
# Check if path exists
dir "C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation\generate_advisories_api.py"

# Or set custom path in .env.local
AUTOMATION_PATH=C:\path\to\ThreatAdvisory-Automation
```

### Error: "Python not found"

**Solution**: Install Python or set path:
```bash
# Add to .env.local
PYTHON_PATH=C:\Python39\python.exe
```

### Error: "No new items"

**Solutions**:
- Check RSS feeds are accessible
- Clear seen items cache: Delete `workspace/seen_items.json`
- Verify internet connectivity
- Check `config.yaml` has RSS sources

### Error: "LLM failed"

**Solutions**:
- Verify Hugging Face API is accessible
- Check `config.yaml` model configuration
- Review logs in `ThreatAdvisory-Automation/logs/`
- Try local Ollama model instead

### Advisories not appearing

**Solutions**:
- Check MongoDB connection in `.env.local`
- Verify admin permissions
- Check browser console for errors
- Review API logs: `Network` tab in DevTools

### Generation takes too long

**Optimization tips**:
- Reduce `maxItems` count (use 1-2 instead of 3)
- Use faster LLM model
- Reduce RSS feed count in `config.yaml`
- Increase `max_chars` limit in fetch_page_text

## 🛡️ Security Considerations

1. **Admin Only**: Auto Advisory feature requires admin privileges
2. **Rate Limiting**: Consider implementing rate limits for API endpoint
3. **Input Validation**: All generated content is validated before storage
4. **Token Security**: JWT tokens stored in HTTP-only cookies
5. **API Keys**: Store Hugging Face/Ollama credentials securely

## 📈 Performance

**Typical Performance Metrics**:
- Single advisory generation: 20-30 seconds
- 3 advisories: 60-90 seconds
- RSS feed fetch: 10-15 seconds
- LLM processing: 15-25 seconds per advisory
- Database save: <1 second

**Optimization**:
- Use local Ollama for faster processing
- Reduce RSS feed count
- Implement caching for frequent sources

## 🔄 Update Process

### Updating ThreatAdvisory-Automation

```bash
cd C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
git pull origin main
pip install -r requirements.txt --upgrade
```

### Updating Threat-Advisory Integration

```bash
cd C:\Threat-Advisory
npm install
# Restart dev server
npm run dev
```

## 📚 Additional Resources

- **ThreatAdvisory-Automation README**: `/ThreatAdvisory-Automation/README.md`
- **API Documentation**: `/Threat-Advisory/README.md`
- **MITRE ATT&CK**: https://attack.mitre.org/
- **CVE Database**: https://cve.mitre.org/

## 💡 Tips & Best Practices

1. **Regular Updates**: Run Auto Advisory daily for fresh threat intelligence
2. **Review Generated Content**: Always review AI-generated advisories before distributing
3. **Customize Sources**: Tailor RSS feeds to your organization's threat landscape
4. **Monitor Performance**: Check logs regularly for any issues
5. **Backup Database**: Regular MongoDB backups recommended
6. **Cache Management**: Periodically clean `workspace/` directory
7. **Version Control**: Keep both repositories in sync

## Next Steps

1. Auto Advisory button configured
2. ⏭️ Test generation with sample feeds
3. ⏭️ Configure email notifications for new advisories
4. ⏭️ Set up scheduled automatic generation (cron job)
5. ⏭️ Customize advisory templates
6. ⏭️ Integrate with SIEM/SOAR platforms

---

**Need Help?** Check logs in:
- `ThreatAdvisory-Automation/logs/`
- Browser DevTools Console
- MongoDB logs
