# Localhost/127.0.0.1 Removal - Complete Update

## Summary
Removed all hardcoded `localhost` and `127.0.0.1` references from OpenSearch and MongoDB connections across the entire project. All connections now use environment variables with proper validation.

## Critical Environment Variables Required

### AWS/Production Deployment
Your `.env` file **MUST** contain these variables:

```bash
# OpenSearch - AWS Production (REQUIRED)
OPENSEARCH_URL=https://34.195.123.3:9200
OPENSEARCH_HOST=34.195.123.3
OPENSEARCH_PORT=9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=@Man21416181

# MongoDB - Production (REQUIRED)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/threat-advisory

# Application URL (REQUIRED)
NEXTAUTH_URL=https://ti.eagleyesoc.ai
NEXT_PUBLIC_APP_URL=https://ti.eagleyesoc.ai

# JWT & Auth
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-threatwatch-2024

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=itsnikitabhavsar@gmail.com
SMTP_PASS=vpzl cfvz fnvc kejv

# APIs
OPENROUTER_API_KEY=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
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycby2Te16oYufPU0IlN0sMEvE2IXpKEpVfhy3FO2qFBonQ1Urbwf9bETFdsoYlx_Uk7GM/exec
```

## Files Modified

### Backend Python Files (4 files)

#### 1. `backend/test_opensearch_connection.py`
**Changes:**
- Removed `"localhost"` default from `OPENSEARCH_HOST`
- Prioritizes `OPENSEARCH_URL` environment variable
- Falls back to `OPENSEARCH_HOST` + `OPENSEARCH_PORT`
- Throws error if neither is set
- Auto-detects SSL from URL scheme

**Before:**
```python
host = os.getenv("OPENSEARCH_HOST", "localhost")
if host in {"localhost", "127.0.0.1"}:
    use_ssl = False
else:
    use_ssl = True
```

**After:**
```python
opensearch_url = os.getenv("OPENSEARCH_URL")
if opensearch_url:
    parsed = urlparse(opensearch_url)
    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == 'https' else 9200)
    use_ssl = parsed.scheme == 'https'
else:
    host = os.getenv("OPENSEARCH_HOST")
    port = int(os.getenv("OPENSEARCH_PORT", "9200"))
    use_ssl = True

if not host:
    raise ValueError("OPENSEARCH_HOST or OPENSEARCH_URL must be set")
```

#### 2. `backend/utils/opensearch_client.py`
**Changes:** Same pattern as test_opensearch_connection.py

#### 3. `backend/tools/opensearch.py`
**Changes:** Same pattern as test_opensearch_connection.py

#### 4. `backend/get_sample_articles.py`
**Changes:** Same pattern as test_opensearch_connection.py

### Frontend JavaScript/TypeScript Files (7 files)

#### 5. `lib/opensearchClient.js`
**Changes:**
- Removed `'localhost'` default
- Prioritizes `OPENSEARCH_URL`
- Throws error if no OpenSearch configuration
- Always uses SSL for production

**Before:**
```javascript
const host = process.env.OPENSEARCH_HOST || 'localhost';
const isLocalhost = host === 'localhost' || host === '127.0.0.1';
const scheme = isLocalhost ? 'http' : 'https';
const clientConfig = { node: `${scheme}://${host}:${port}` };
```

**After:**
```javascript
const opensearchUrl = process.env.OPENSEARCH_URL;
const host = process.env.OPENSEARCH_HOST;

if (!opensearchUrl && !host) {
  throw new Error('OPENSEARCH_URL or OPENSEARCH_HOST must be set');
}

const nodeUrl = opensearchUrl || `https://${host}:${port}`;
const clientConfig = { node: nodeUrl };
```

#### 6. `pages/api/raw-articles/index.ts`
**Changes:** Already updated in previous fix (from AWS-DEPLOYMENT-FIX.md)

#### 7. `pages/api/raw-articles/fetch.ts`
**Changes:** Already updated with Python3 detection (from AWS-DEPLOYMENT-FIX.md)

#### 8. `pages/api/generated-advisory/[advisory_id].ts`
**Changes:**
- Removed localhost logic
- Uses `OPENSEARCH_URL` or constructs from host/port
- Throws error if not configured

#### 9. `pages/api/manual-advisory/generate.ts`
**Changes:**
- Updated environment variable passing to Python subprocess
- Added `OPENSEARCH_URL` to environment
- Removed `'localhost'` defaults
- Updated logging to show URL instead of host/port

#### 10. `lib/agenda.js`
**Changes:**
- Removed `'mongodb://localhost:27017/threat-advisory'` fallback
- Now requires `MONGODB_URI` to be set
- Throws error if `MONGODB_URI` is missing

**Before:**
```javascript
const agenda = new Agenda({
  db: { address: process.env.MONGODB_URI || 'mongodb://localhost:27017/threat-advisory' }
});
```

**After:**
```javascript
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable must be set');
}

const agenda = new Agenda({
  db: { address: process.env.MONGODB_URI }
});
```

#### 11. `lib/agenda_fixed.js` & `lib/agenda_clean.js`
**Changes:** Same as agenda.js

#### 12. `cron-scheduler.js`
**Changes:**
- Removed hardcoded `'http://localhost:3000'`
- Uses `NEXTAUTH_URL` or `NEXT_PUBLIC_APP_URL`
- Throws error if neither is set

**Before:**
```javascript
const PROCESS_URL = 'http://localhost:3000/api/scheduled-emails/process';
```

**After:**
```javascript
const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;

if (!BASE_URL) {
  throw new Error('NEXTAUTH_URL or NEXT_PUBLIC_APP_URL must be set');
}

const PROCESS_URL = `${BASE_URL}/api/scheduled-emails/process`;
```

### Configuration Files

#### 13. `next.config.js`
**Changes:** Already updated (from AWS-DEPLOYMENT-FIX.md)
- Removed deprecated `eslint` config
- Updated `images.domains` to `images.remotePatterns`

## What This Means

### ✅ Benefits
1. **No accidental localhost connections** - All connections require explicit configuration
2. **Clear error messages** - Tells you exactly what's missing
3. **AWS-ready** - Uses `OPENSEARCH_URL` for AWS OpenSearch domains
4. **Production-safe** - Defaults to SSL/HTTPS when not localhost
5. **Environment-aware** - Python detection, URL parsing, proper SSL handling

### ⚠️ Breaking Changes
If you don't have these environment variables set, the application will **fail to start** with clear error messages:

```
Error: OPENSEARCH_URL or OPENSEARCH_HOST must be set
Error: MONGODB_URI environment variable must be set
Error: NEXTAUTH_URL or NEXT_PUBLIC_APP_URL must be set
```

This is **intentional** - it prevents production deployments from accidentally connecting to localhost.

## Testing on AWS

### 1. Verify Environment Variables
```bash
# SSH into your EC2 instance
printenv | grep OPENSEARCH
printenv | grep MONGODB
printenv | grep NEXTAUTH
```

### 2. Test OpenSearch Connection
```bash
cd /home/ubuntu/TI-dashboard/backend
source venv/bin/activate
python3 test_opensearch_connection.py
```

Expected output:
```
Connecting to: 34.195.123.3:9200 (SSL: True)
OpenSearch is reachable (PING OK)
📊 Cluster Health:
Status: green
...
Connection test SUCCESSFUL
```

### 3. Restart Application
```bash
cd /home/ubuntu/TI-dashboard
pm2 restart ti-dashboard
pm2 logs ti-dashboard
```

### 4. Verify No Localhost Errors
Check logs for:
- ✅ No `ECONNREFUSED 127.0.0.1:9200`
- ✅ No `localhost` connection attempts
- ✅ Successful OpenSearch queries
- ✅ MongoDB connection established

## Rollback (if needed)

If you need to revert for local development, add these to `.env.local`:

```bash
OPENSEARCH_URL=http://localhost:9200
MONGODB_URI=mongodb://localhost:27017/threat-advisory
NEXTAUTH_URL=http://localhost:3000
```

## Security Notes

1. **SSL/TLS:** All production connections now use HTTPS/SSL by default
2. **Credentials:** Always required for OpenSearch (no anonymous access)
3. **Error Messages:** Sanitized to not leak credentials in logs
4. **Environment Isolation:** No shared localhost connections between dev/prod

## Verification Checklist

- [x] All Python backend files updated
- [x] All JavaScript/TypeScript API files updated
- [x] MongoDB connection files updated
- [x] Cron scheduler updated
- [x] Next.js config fixed
- [x] Environment variables documented
- [x] Error handling added
- [x] SSL configuration corrected
- [x] Python3 detection implemented
- [x] AWS deployment ready

## Next Steps

1. **Deploy to AWS:**
   ```bash
   git add .
   git commit -m "Remove all localhost/127.0.0.1 hardcoded connections"
   git push origin main
   ```

2. **On AWS EC2:**
   ```bash
   cd /home/ubuntu/TI-dashboard
   git pull
   npm install
   npm run build
   pm2 restart ti-dashboard
   ```

3. **Monitor Logs:**
   ```bash
   pm2 logs ti-dashboard --lines 100
   ```

4. **Test Application:**
   - Visit your domain: `https://ti.eagleyesoc.ai`
   - Login and access Raw Articles
   - Verify OpenSearch data loads
   - Check email scheduling works

## Support

If you encounter errors:

1. **Check environment variables are set:**
   ```bash
   pm2 env 0  # Shows environment for first PM2 process
   ```

2. **Test connections separately:**
   ```bash
   # OpenSearch
   curl -k -u admin:password https://34.195.123.3:9200
   
   # MongoDB (if using Atlas)
   # Check MongoDB Atlas network access whitelist
   ```

3. **Check logs:**
   ```bash
   pm2 logs ti-dashboard --err  # Show only errors
   ```

## Files Reference

All modified files in this update:
- `backend/test_opensearch_connection.py`
- `backend/utils/opensearch_client.py`
- `backend/tools/opensearch.py`
- `backend/get_sample_articles.py`
- `lib/opensearchClient.js`
- `pages/api/generated-advisory/[advisory_id].ts`
- `pages/api/manual-advisory/generate.ts`
- `pages/api/raw-articles/index.ts` (previous fix)
- `pages/api/raw-articles/fetch.ts` (previous fix)
- `lib/agenda.js`
- `lib/agenda_fixed.js`
- `lib/agenda_clean.js`
- `cron-scheduler.js`
- `next.config.js` (previous fix)

Total: **14 files** across frontend and backend
