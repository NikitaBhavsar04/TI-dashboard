# AWS Deployment Fixes - January 27, 2026

## Issues Fixed

### 1. OpenSearch Connection Error ✅
**Error:** `Error [ConnectionError]: connect ECONNREFUSED 127.0.0.1:9200`

**Root Cause:** The application was trying to connect to OpenSearch on localhost (127.0.0.1:9200) instead of using the AWS OpenSearch endpoint configured in `.env`.

**Fix Applied:**
- Updated `pages/api/raw-articles/index.ts` to prioritize `OPENSEARCH_URL` environment variable
- Now properly uses `https://34.195.123.3:9200` from your `.env` file
- Falls back to constructing URL from HOST/PORT if OPENSEARCH_URL is not set

### 2. Python Not Found Error ✅
**Error:** `Error: spawn python ENOENT`

**Root Cause:** AWS EC2 instances (Ubuntu/Linux) use `python3` command, not `python`. The code was hardcoded to use `python` which doesn't exist on Linux systems by default.

**Fix Applied:**
- Updated `pages/api/raw-articles/fetch.ts` to auto-detect the platform
- Uses `python3` on Linux/macOS (AWS EC2)
- Uses `python` on Windows (local development)

### 3. Next.js Configuration Warnings ✅
**Warnings:**
- `eslint configuration in next.config.js is no longer supported`
- `images.domains is deprecated`

**Fix Applied:**
- Removed deprecated `eslint` configuration block
- Replaced `images.domains` with modern `images.remotePatterns`
- Added `allowedDevOrigins` configuration for cross-origin requests

## Deployment Checklist for AWS

### Environment Variables Required
Ensure your AWS EC2 instance has these environment variables set:

```bash
# OpenSearch Configuration (CRITICAL)
OPENSEARCH_URL=https://34.195.123.3:9200
OPENSEARCH_HOST=34.195.123.3
OPENSEARCH_PORT=9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=@Man21416181

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-threatwatch-2024

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=itsnikitabhavsar@gmail.com
SMTP_PASS=vpzl cfvz fnvc kejv

# Other APIs
OPENROUTER_API_KEY=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
TELEGRAM_API_ID=38624614
TELEGRAM_API_HASH=8474ab0b2e6dad94d0425ef6fc2004d7
```

### Python Setup on AWS EC2

```bash
# Install Python 3 and pip
sudo apt update
sudo apt install python3 python3-pip python3-venv -y

# Create virtual environment in backend directory
cd /home/ubuntu/TI-dashboard/backend
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

### Node.js Setup on AWS EC2

```bash
# Install Node.js 18.x or higher
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install dependencies
cd /home/ubuntu/TI-dashboard
npm install

# Build for production
npm run build

# Start with PM2 (recommended)
sudo npm install -g pm2
pm2 start npm --name "ti-dashboard" -- start
pm2 save
pm2 startup
```

### OpenSearch Security Group

Ensure your AWS Security Group allows:
- Inbound TCP port 9200 from your EC2 instance IP
- Or use AWS VPC peering if OpenSearch is in a VPC

### Testing the Fixes

1. **Test OpenSearch Connection:**
```bash
curl -k -u admin:@Man21416181 https://34.195.123.3:9200
```

2. **Test Python:**
```bash
python3 --version
which python3
```

3. **Test Application:**
```bash
npm run dev
# Visit http://your-ec2-ip:3000
# Login and try accessing Raw Articles page
```

## Files Modified

1. [next.config.js](next.config.js)
   - Removed deprecated `eslint` config
   - Updated `images.domains` → `images.remotePatterns`

2. [pages/api/raw-articles/index.ts](pages/api/raw-articles/index.ts)
   - Added `OPENSEARCH_URL` support
   - Fixed SSL configuration for AWS OpenSearch

3. [pages/api/raw-articles/fetch.ts](pages/api/raw-articles/fetch.ts)
   - Auto-detect Python command based on platform
   - Added logging for debugging

## Common AWS Deployment Issues

### Issue: Port 3000 not accessible
**Solution:** Update Security Group to allow inbound TCP 3000

### Issue: Process stops when SSH disconnects
**Solution:** Use PM2 or systemd service

### Issue: Python packages not found
**Solution:** Activate virtual environment before running Python scripts

### Issue: MongoDB connection timeout
**Solution:** Whitelist EC2 IP in MongoDB Atlas Network Access

## Restart Instructions

After deploying these fixes:

```bash
# If using PM2
pm2 restart ti-dashboard

# If running directly
npm run build
npm start

# Check logs
pm2 logs ti-dashboard
```

## Verification

✅ Next.js starts without warnings
✅ OpenSearch connection succeeds (no ECONNREFUSED)
✅ Python scripts execute successfully
✅ Raw Articles page loads data
✅ Email scheduling works

## Support

If issues persist:
1. Check application logs: `pm2 logs ti-dashboard`
2. Check Python script logs in backend directory
3. Verify all environment variables are set: `printenv | grep OPENSEARCH`
4. Test OpenSearch connectivity separately
