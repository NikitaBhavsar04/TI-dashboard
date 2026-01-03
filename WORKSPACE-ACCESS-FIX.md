# Workspace HTML Access Fix

## Problem
Previously, trying to access HTML files at `/backend/workspace/[filename].html` would result in a "Cannot GET" error.

## Solution Implemented
Added URL rewrite rules to `next.config.js` that automatically redirect `/backend/workspace/*` paths to the correct API endpoint `/api/workspace/*`.

## How to Access HTML Files

### Option 1: Use the backend/workspace path (recommended)
```
http://localhost:3000/backend/workspace/SOC-TA-20260101-0956-01_MongoBleed_Vulnerability.html
```
This will automatically be rewritten to the correct API endpoint.

### Option 2: Use the API path directly
```
http://localhost:3000/api/workspace/SOC-TA-20260101-0956-01_MongoBleed_Vulnerability.html
```

## Important Notes

1. **Default Port**: Next.js runs on port 3000 by default, not 8080
   - If you're trying to access `localhost:8080`, change it to `localhost:3000`
   - Or specify a custom port when starting: `npm run dev -- -p 8080`

2. **Restart Required**: After modifying `next.config.js`, you MUST restart the Next.js server:
   ```bash
   # Stop the current server (Ctrl+C in the terminal)
   # Then restart:
   npm run dev
   # Or for a specific port:
   npm run dev -- -p 8080
   ```

3. **File Location**: HTML files must be in `C:\Threat-Advisory\backend\workspace\`

## Quick Start

1. Stop the current Next.js server if running (Ctrl+C)
2. Restart the server:
   ```bash
   cd C:\Threat-Advisory
   npm run dev
   ```
3. Access your HTML files at:
   ```
   http://localhost:3000/backend/workspace/[filename].html
   ```

## Troubleshooting

- **404 Not Found**: Check that the file exists in `backend\workspace\` directory
- **Cannot GET**: Ensure the server has been restarted after the config change
- **Wrong Port**: Make sure you're using port 3000 (or the custom port you specified)
