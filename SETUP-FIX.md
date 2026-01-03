# 🔧 Auto Advisory Setup Fix Guide

## ❌ Error: "failed to parse automation output"

This error occurs when the Python LLM integration needs configuration. Here's how to fix it:

## 🎯 Quick Fix (5 minutes)

### Option 1: Use HuggingFace API (Free - Recommended)

1. **Get Free HuggingFace API Key**
   - Go to: https://huggingface.co/settings/tokens
   - Sign up/login (free)
   - Click "New token"
   - Name: "ThreatAdvisory"
   - Type: Read
   - Copy the token (hf_xxxx...)

2. **Set Environment Variable**

   **Windows PowerShell:**
   ```powershell
   $env:HF_API_KEY="hf_your_token_here"
   ```

   **Or add to Windows System Environment:**
   - Search "Environment Variables"
   - User variables → New
   - Variable: `HF_API_KEY`
   - Value: `hf_your_token_here`

3. **Test It**
   ```bash
   cd C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
   python generate_advisories_api.py 1
   ```

   Should see: `{"generated": [...]}`

### Option 2: Use Local Ollama (No API Key Needed)

1. **Install Ollama**
   - Download: https://ollama.ai/download
   - Install for Windows

2. **Pull Model**
   ```bash
   ollama pull llama3
   ```

3. **Update Config**
   Edit `config.yaml`:
   ```yaml
   ollama:
     enabled: true
     host: "http://localhost:11434"
     model: "llama3:latest"
   huggingface:
     enabled: false
   ```

4. **Start Ollama**
   ```bash
   ollama serve
   ```

## 🔄 Already Fixed Issues

✅ **OpenAI Library Version** - Downgraded to 0.28 (compatible)
✅ **JSON Parsing** - Updated to extract JSON from mixed output
✅ **Error Handling** - Improved stderr handling

## 📋 Complete Setup Checklist

- [x] Python 3.8+ installed
- [x] Dependencies installed (`pip install -r requirements.txt`)
- [x] OpenAI library downgraded to 0.28
- [x] config.yaml configured
- [ ] **→ HuggingFace API key set OR Ollama installed**
- [ ] Test script runs successfully
- [ ] Web interface works

## 🧪 Test Commands

### Test Python Script Directly
```bash
cd C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation

# Set API key for this session
$env:HF_API_KEY="hf_your_key"

# Run test
python generate_advisories_api.py 1
```

**Expected Output:**
```json
{"generated": [{
  "advisory_id": "SOC-TA-20260101-1234-01",
  "title": "...",
  "html_path": "C:\\...\\workspace\\SOC-TA-....html",
  "json_path": "C:\\...\\workspace\\SOC-TA-....json",
  "criticality": "HIGH"
}]}
```

### Test from Web Interface
1. Start dev server: `npm run dev`
2. Login as admin
3. Click "Auto Advisory" button
4. Should generate advisories successfully

## 🔍 Verify Setup

Run the integration test:
```bash
cd C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
python test_integration.py
```

## 🆘 Still Having Issues?

### Check Logs
```bash
# Python script logs
type C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation\logs\*.log

# Browser console (F12)
# Check for error messages
```

### Verify API Key
```bash
# Test HuggingFace API
python -c "import os; print('HF_API_KEY:', os.environ.get('HF_API_KEY', 'NOT SET'))"
```

### Manual Test
```bash
cd C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation

# Run with verbose output
python -c "
import os
os.environ['HF_API_KEY'] = 'your_key_here'
from llm.summarize import call_llm
result = call_llm('Test prompt: Generate JSON {\"test\": \"value\"}')
print('Result:', result)
"
```

## 📝 Environment Variables Reference

### For HuggingFace (Option 1)
```bash
HF_API_KEY=hf_your_token_here
# Optional:
HF_CHAT_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

### For OpenAI (Alternative)
```bash
OPENAI_API_KEY=sk-your_key_here
```

### For Ollama (Option 2)
No environment variables needed, just:
- Install Ollama
- Update config.yaml
- Run `ollama serve`

## 🎯 Recommended Solution

**For Most Users: HuggingFace (Free)**
- ✅ No installation needed
- ✅ Free API access
- ✅ Good quality models
- ✅ Fast setup (5 minutes)

**For Privacy/Offline: Ollama**
- ✅ 100% local
- ✅ No API keys
- ✅ No internet after setup
- ❌ Requires 8GB+ RAM
- ❌ Slower processing

## ✅ Success Criteria

After setup, you should see:
1. ✅ Python script outputs valid JSON
2. ✅ No LLM errors in output
3. ✅ HTML files generated in workspace/
4. ✅ Auto Advisory button works in web UI
5. ✅ New advisories appear after generation

## 🚀 Next Steps

Once API key is set:
1. Restart any open terminals (to load env variable)
2. Test Python script: `python generate_advisories_api.py 1`
3. Start web app: `npm run dev`
4. Click "Auto Advisory" button
5. Enjoy automated threat intelligence! 🎉

---

**Quick Command Summary:**
```powershell
# 1. Get HuggingFace token from https://huggingface.co/settings/tokens
# 2. Set environment variable
$env:HF_API_KEY="hf_your_token_here"

# 3. Test
cd C:\Users\BAPS.DESKTOP-P2HTS9B\ThreatAdvisory-Automation
python generate_advisories_api.py 1

# 4. Start app
cd C:\Threat-Advisory
npm run dev

# 5. Use Auto Advisory button!
```
