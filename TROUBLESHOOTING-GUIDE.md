# Troubleshooting Guide - Flask API Backend

## Common Issues and Solutions

### 1. ModuleNotFoundError: No module named 'flask_cors'

**Error Message:**
```
ModuleNotFoundError: No module named 'flask_cors'
```

**Solution:**
```powershell
pip install flask-cors
```

**Why it happens:** Flask-CORS is not installed in your Python environment.

---

### 2. ModuleNotFoundError: No module named 'utils'

**Error Message:**
```
ModuleNotFoundError: No module named 'utils'
```

**Solution:**
This has been fixed in all route files by adding:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
```

**Verification:** Check that this code is at the top of:
- `api/routes/advisory.py`
- `api/routes/feeds.py`
- `api/routes/iocs.py`
- `api/routes/test_pipeline.py`

---

### 3. Flask Server Won't Start

**Error Message:**
```
Address already in use
```

**Solution:**
Port 8000 is already occupied. Kill the existing process:

```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Alternative:** Change the port in `api/app.py`:
```python
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001)  # Changed to 8001
```

---

### 4. OpenSearch Connection Failed

**Error Message:**
```
opensearchpy.exceptions.ConnectionError: N/A, message='Connection error.'
```

**Solutions:**

#### A. Check if OpenSearch is running
```powershell
curl http://localhost:9200
```

Should return cluster information. If not, start OpenSearch.

#### B. Check configuration in config.yaml
```yaml
opensearch:
  host: "localhost"  # Or your OpenSearch host
  port: 9200
  use_ssl: false     # false for localhost
```

#### C. Check environment variables
```powershell
# Check if env vars are set
echo $env:OPENSEARCH_HOST
echo $env:OPENSEARCH_PORT
```

If set incorrectly, either:
- Update them
- Or remove them to use config.yaml defaults

---

### 5. CORS Errors in Frontend

**Error Message (Browser Console):**
```
Access to fetch at 'http://localhost:8000/api/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Solution:**

Verify CORS is enabled in `api/app.py`:
```python
from flask_cors import CORS
app = Flask(__name__)
CORS(app)  # This should be present
```

For specific origins:
```python
CORS(app, origins=['http://localhost:3000', 'https://yourdomain.com'])
```

---

### 6. JSON Decode Error

**Error Message:**
```
json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

**Solutions:**

#### Check Content-Type Header
```javascript
// Frontend fetch call
fetch('http://localhost:8000/api/advisory/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'  // ← Important!
  },
  body: JSON.stringify({ article_id: 'abc123' })
});
```

#### Check Request Body
```python
# In Flask route, check if data is valid
data = request.get_json()
if not data:
    return jsonify({'error': 'Invalid JSON'}), 400
```

---

### 7. Import Circular Dependencies

**Error Message:**
```
ImportError: cannot import name 'X' from partially initialized module 'Y'
```

**Solution:**

Import functions/modules directly, not from:
```python
# ❌ Wrong
from manual_advisory import *

# ✅ Correct
import manual_advisory
result = manual_advisory.generate_advisory(article_id)
```

---

### 8. OpenSearch Index Not Found

**Error Message:**
```
opensearchpy.exceptions.NotFoundError: index_not_found_exception
```

**Solution:**

Create the indices:
```python
from utils.opensearch_client import get_opensearch_client

client = get_opensearch_client()

# Create raw articles index
client.indices.create(index='ti-raw-articles', ignore=400)

# Create advisories index
client.indices.create(index='ti-generated-advisories', ignore=400)
```

Or run first-time setup script if available.

---

### 9. Slow Advisory Generation

**Issue:** Advisory generation takes too long (>30 seconds)

**Solutions:**

#### A. Check LLM Configuration
If using OpenAI:
```python
# Check API key is set
import os
print(os.getenv('OPENAI_API_KEY'))
```

#### B. Check Network Connection
- Verify connection to NVD API (CVSS scores)
- Verify connection to MITRE ATT&CK
- Verify connection to LLM service

#### C. Use Local LLM (Ollama)
For faster local processing:
```yaml
# config.yaml
llm:
  provider: "ollama"
  model: "mistral"
  base_url: "http://localhost:11434"
```

---

### 10. Test Script Fails

**Error Message:**
```
pytest: command not found
```

**Solution:**
```powershell
pip install pytest
```

**Running Tests:**
```powershell
cd C:\Threat-Advisory\backend
pytest tests/test_api.py -v
```

---

### 11. Database SSL/TLS Errors

**Error Message:**
```
opensearchpy.exceptions.SSLError
```

**Solutions:**

#### For localhost (development)
```python
# In utils/opensearch_client.py
if host in {"localhost", "127.0.0.1"}:
    scheme = "http"
    use_ssl = False  # No SSL for localhost
```

#### For remote (production)
```python
else:
    scheme = "https"
    use_ssl = True
    verify_certs = False  # For self-signed certificates
```

---

### 12. Route Not Found (404)

**Error Message:**
```
404 Not Found
```

**Solutions:**

#### A. Check route registration
In `api/app.py`, verify routes are being discovered:
```python
# Add debug print
for filename in os.listdir(routes_dir):
    print(f"Loading route: {filename}")
```

#### B. Verify URL structure
```
✅ Correct: http://localhost:8000/api/advisory/generate
❌ Wrong:   http://localhost:8000/advisory/generate
❌ Wrong:   http://localhost:8000/api/advisories/generate
```

#### C. Check blueprint prefix
In route file:
```python
bp = Blueprint('advisory', __name__)  # Name matches filename
```

In app.py:
```python
app.register_blueprint(module.bp, url_prefix=f"/api/{filename[:-3]}")
# Creates: /api/advisory
```

---

### 13. Memory Issues / Out of Memory

**Issue:** Python process consuming too much memory

**Solutions:**

#### A. Limit article text size
In collectors:
```python
article_text = fetch_page_text(url, max_chars=20000)  # Limit to 20KB
```

#### B. Use pagination
```python
# Don't fetch all articles at once
limit = 10  # Small batches
offset = 0
```

#### C. Clear caches
```python
# In route functions
import gc
gc.collect()  # Force garbage collection
```

---

### 14. Config File Not Found

**Error Message:**
```
FileNotFoundError: config.yaml not found
```

**Solution:**

Ensure config.yaml exists in backend directory:
```powershell
cd C:\Threat-Advisory\backend
dir config.yaml  # Should exist
```

If missing, create from template or copy from another environment.

---

### 15. Permission Denied Errors

**Error Message:**
```
PermissionError: [WinError 5] Access is denied
```

**Solutions:**

#### A. Run as Administrator
Right-click PowerShell → "Run as Administrator"

#### B. Check file permissions
```powershell
icacls C:\Threat-Advisory\backend
```

#### C. Virtual environment issues
```powershell
# Deactivate and recreate venv
deactivate
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

## Debugging Tips

### Enable Debug Mode
```python
# In api/app.py
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)  # Add debug=True
```

**Warning:** Only use debug mode in development!

### Check Logs
```python
# In route functions
from utils.common import logger

logger.info("Processing request...")
logger.error(f"Error occurred: {e}")
```

### Test Individual Components
```python
# Test OpenSearch connection
python -c "from utils.opensearch_client import get_opensearch_client; c = get_opensearch_client(); print(c.ping())"

# Test config loading
python -c "from utils.common import read_yaml; print(read_yaml('config.yaml'))"

# Test IOC extraction
python -c "from collectors.iocs import extract_iocs; print(extract_iocs('Test at 192.168.1.1'))"
```

### Use Interactive Python
```powershell
python
>>> from api.app import app
>>> with app.test_client() as client:
...     response = client.get('/api/feeds/list')
...     print(response.json)
```

---

## Health Check Checklist

Run these commands to verify system health:

```powershell
# 1. Check Python version
python --version  # Should be 3.10+

# 2. Check Flask installation
python -c "import flask; print(flask.__version__)"

# 3. Check OpenSearch connection
curl http://localhost:9200

# 4. Check Flask server
curl http://localhost:8000/api/test_pipeline/db-health

# 5. Run test script
cd C:\Threat-Advisory\backend\api
python test_endpoints.py

# 6. Run full test suite
cd C:\Threat-Advisory\backend
pytest tests/test_api.py -v
```

---

## Getting Help

### Check Documentation
1. [Flask API Quick Reference](FLASK-API-QUICK-REFERENCE.md)
2. [System Architecture Visual](SYSTEM-ARCHITECTURE-VISUAL.md)
3. [Frontend Integration Guide](FRONTEND_INTEGRATION_GUIDE.md)

### Enable Verbose Logging
```python
# In utils/common.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Check GitHub Issues
Look for similar issues in the project repository.

### Contact Support
Include the following in your support request:
- Python version
- Flask version
- OpenSearch version
- Full error traceback
- Steps to reproduce
- config.yaml (remove sensitive data)

---

## Quick Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| Module not found | `pip install <module>` |
| Port in use | Change port or kill process |
| CORS error | Verify `CORS(app)` in app.py |
| OpenSearch down | Start OpenSearch service |
| Config not found | Create config.yaml in backend/ |
| Import errors | Check sys.path.insert in routes |
| Slow generation | Check LLM configuration |
| 404 errors | Verify URL structure |
| JSON errors | Add Content-Type header |
| SSL errors | Set use_ssl=False for localhost |

---

Still having issues? Check the logs in the terminal where Flask is running for detailed error messages!
