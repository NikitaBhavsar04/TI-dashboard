# 🚀 Auto Advisory Quick Start

## One-Minute Setup

### 1. Prerequisites Check ✓
```bash
# Verify ThreatAdvisory-Automation exists
dir C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation\generate_advisories_api.py

# Install Python dependencies
cd C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
pip install -r requirements.txt
```

### 2. Start Threat-Advisory ✓
```bash
cd C:\Threat-Advisory
npm run dev
```

### 3. Generate Advisory ✓
1. Login: `admin@threatwatch.com` / `admin123`
2. Go to: **Advisories** page
3. Click: **Auto Advisory** button (green, with ⚡ icon)
4. Wait: 60-90 seconds
5. Done: Page refreshes with new advisories!

## Button Location

```
┌─────────────────────────────────────────────┐
│  Threat Intelligence Advisories             │
├─────────────────────────────────────────────┤
│  [Refresh Data] [Auto Advisory] [New Advisory] [Scheduled Emails]
│                     ↑
│                  Click here!
└─────────────────────────────────────────────┘
```

## What It Does

✅ Fetches threats from 50+ RSS feeds
✅ AI analyzes and structures data
✅ Generates professional HTML advisories
✅ Saves to MongoDB automatically
✅ Includes CVEs, MITRE ATT&CK, recommendations
✅ Matches format of manual advisories

## Typical Output

**Generated Advisories Include:**
- Title: "Ivanti EPM Stored XSS Vulnerability"
- Severity: Critical/High/Medium/Low
- Executive Summary (3 paragraphs)
- CVE IDs: CVE-2024-XXXXX
- MITRE Tactics: T1566, T1190, etc.
- Recommendations: Patch, mitigation steps
- References: Original source links

## Quick Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| "Script not found" | Check path: `C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation` |
| "Python error" | Install: `pip install -r requirements.txt` |
| "No new items" | Clear cache: Delete `workspace/seen_items.json` |
| Page doesn't refresh | Reload manually: `Ctrl+R` |

## Configuration

**Generate More Advisories:**
Edit `pages/advisories/index.tsx` line ~198:
```typescript
body: JSON.stringify({ maxItems: 5 }) // Change 3 to 5
```

**Add RSS Feeds:**
Edit `ThreatAdvisory-Automation/config.yaml`:
```yaml
sources:
  rss:
    - "https://your-feed.com/rss"
```

## Performance

⏱️ **Timeline:**
- RSS fetch: 10-15 sec
- AI analysis: 15-25 sec per advisory
- Render + Save: 5-10 sec
- **Total**: ~60-90 seconds for 3 advisories

## Next Steps

1. ✅ Basic setup complete
2. 📖 Read full guide: `AUTO-ADVISORY-INTEGRATION.md`
3. ⚙️ Customize RSS feeds in `config.yaml`
4. 🔄 Set up scheduled generation (optional)
5. 📧 Configure email notifications (optional)

## Need Help?

**Full Documentation:** `AUTO-ADVISORY-INTEGRATION.md`
**Logs:** `ThreatAdvisory-Automation/logs/`
**Console:** Browser DevTools (F12)

---

**Ready to Go!** Click the **Auto Advisory** button and watch the magic happen! 🎉
