# Auto Advisory Quick Reference Card

## ⚡ 5-Minute Setup

### Step 1: Configure Backend
```powershell
# Edit this file and add your OpenAI API key:
c:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation\.env

# Line to update:
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 2: Start Backend (Terminal 1)
```powershell
cd c:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
.\start-api.bat
```
✓ Wait for: `INFO: Uvicorn running on http://0.0.0.0:8000`

### Step 3: Start Frontend (Terminal 2)
```powershell
cd c:\Threat-Advisory
npm run dev
```
✓ Wait for: `ready - started server`

### Step 4: Test It
```powershell
cd c:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
.\test-integration.ps1
```

### Step 5: Use It
1. Open http://localhost:3000
2. Click "Auto Advisory" button
3. Enter threat details
4. Click "Generate Advisory"
5. ✓ Done!

---

## 📁 Key Files

| What | Where | Edit? |
|------|-------|-------|
| Frontend Config | `.env.local` in `c:\Threat-Advisory` | Already done |
| Backend Config | `.env` in `c:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation` | 🔧 Add API key |
| Backend API | `api.py` in ThreatAdvisory-Automation | ❌ Don't change |
| Frontend Modal | `AutoAdvisoryModal.tsx` in Threat-Advisory | ❌ Don't change |

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection refused | Start backend: `.\start-api.bat` |
| LLM generation failed | Check OpenAI API key in `.env` |
| CORS error | Check both servers running on localhost |
| Port in use | `netstat -ano \| findstr :8000` then `taskkill /PID xxx /F` |
| Module not found | `pip install -r requirements.txt` |

---

## Verification

```powershell
# Test backend
curl http://localhost:8000/docs

# Test frontend
curl http://localhost:3000

# Full integration test
.\test-integration.ps1
```

---

## 📝 Example Request

```json
{
  "title": "HPE OneView Critical RCE CVE-2024-50623",
  "link": "https://example.com/advisory",
  "summary": "Unauthenticated remote code execution vulnerability..."
}
```

## 📤 Example Response

```json
{
  "title": "HPE OneView Unauthenticated RCE Vulnerability",
  "summary": "Three-paragraph executive summary...",
  "mitre": ["T1190", "T1133"],
  "cves": ["CVE-2024-50623"],
  "severity": "CRITICAL",
  "recommendations": ["Patch immediately", "Monitor for exploitation"],
  "raw": { /* detailed analysis */ }
}
```

---

## 🚀 Performance

- **Response Time**: 5-30 seconds
- **Max Input**: 15,000 characters
- **Concurrent Requests**: OpenAI API limited

---

## 📚 Documentation

- **Full Setup**: `AUTO-ADVISORY-INTEGRATION.md`
- **Quick Start**: `AUTO-ADVISORY-README.md`
- **Implementation**: `IMPLEMENTATION-SUMMARY.md`

---

## 🔐 Security Checklist

- [ ] Never commit API keys
- [ ] Use `.env` files for secrets
- [ ] Validate input on frontend
- [ ] Use HTTPS in production
- [ ] Restrict CORS to trusted domains
- [ ] Implement rate limiting
- [ ] Monitor API usage

---

## 💡 Pro Tips

1. **Test the endpoint**: Use http://localhost:8000/docs (Swagger UI)
2. **Check logs**: Look at the terminal where you started the server
3. **Slow response**: Normal - LLM takes time. Check OpenAI status page.
4. **Customize threat types**: Edit `main.py` VALID_TYPES in ThreatAdvisory-Automation
5. **Use different LLM**: Set `HF_API_KEY` and `HF_CHAT_MODEL` in `.env`

---

## 🆘 Getting Help

1. Check troubleshooting section above
2. Review full documentation files
3. Run integration test: `.\test-integration.ps1`
4. Check API docs: http://localhost:8000/docs
5. Review console logs for specific errors

---

## ✨ Features Enabled

Generate advisories from threat feeds
Extract CVEs automatically
Map to MITRE ATT&CK tactics
Create executive summaries
Get security recommendations
Severity classification

---

**Last Updated**: January 1, 2026
**Status**: Ready to Use
