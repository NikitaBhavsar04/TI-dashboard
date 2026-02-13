# MongoDB Configuration for IP Sweep

## Problem Fixed
The IP sweep was failing because MongoDB connection wasn't properly configured for both local and Docker deployments.

## What Was Changed

### 1. Updated `backend/ip_sweep.py`
- Now supports multiple environment variable names: `MONGO_URI` or `MONGODB_URI`
- Builds connection string from components if needed (for Docker/K8s)
- Has 5-second connection timeout to fail fast
- Provides clear error messages if MongoDB is not available

### 2. Added to `.env`
```env
MONGODB_URI=mongodb+srv://threatadvisory:dwoCFLCGxMqXzAKq@threatadvisory.atzvfoo.mongodb.net/?appName=ThreatAdvisory
MONGODB_DB=soc
```

## Environment Variables

### Option 1: Full URI (Recommended for MongoDB Atlas)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB=soc
```

### Option 2: Component-based (For Docker/Local MongoDB)
```env
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USER=admin
MONGODB_PASSWORD=password
MONGODB_AUTH_SOURCE=admin
MONGODB_DB=soc
```

## Docker Deployment

### Docker Compose Example
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: ti-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    networks:
      - ti-network

  opensearch:
    image: opensearchproject/opensearch:2
    container_name: ti-opensearch
    environment:
      - discovery.type=single-node
      - DISABLE_SECURITY_PLUGIN=true
    ports:
      - "9200:9200"
    networks:
      - ti-network

  nextjs-app:
    build: .
    container_name: ti-dashboard
    ports:
      - "3000:3000"
    environment:
      # MongoDB Configuration
      MONGODB_HOST=mongodb
      MONGODB_PORT=27017
      MONGODB_USER=admin
      MONGODB_PASSWORD=password
      MONGODB_DB=soc

      # OpenSearch Configuration
      OPENSEARCH_URL=http://opensearch:9200

      # Other environment variables
      OPENROUTER_API_KEY=your-key-here
      JWT_SECRET=your-secret-here
    depends_on:
      - mongodb
      - opensearch
    networks:
      - ti-network

networks:
  ti-network:
    driver: bridge

volumes:
  mongodb_data:
```

### Dockerfile Example
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install Python and dependencies for backend scripts
RUN apk add --no-cache python3 py3-pip

# Copy package files
COPY package*.json ./
RUN npm install

# Copy Python requirements
COPY backend/requirements.txt ./backend/
RUN pip3 install -r backend/requirements.txt

# Copy application code
COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Verifying Connection

### Test MongoDB Connection
```bash
# From your project directory
cd backend
python -c "from pymongo import MongoClient; import os; from dotenv import load_dotenv; load_dotenv('../.env'); uri = os.getenv('MONGODB_URI'); client = MongoClient(uri); print('✅ MongoDB Connected:', client.server_info()['version'])"
```

### Test IP Sweep
```bash
# From your project directory
cd backend
python ip_sweep.py <advisory-id>
```

## Current Setup

You are using **MongoDB Atlas** (cloud-hosted):
```
Host: threatadvisory.atzvfoo.mongodb.net
Database: soc
Collection: clients
```

This will work for both:
- ✅ Local development (your current setup)
- ✅ Docker deployments (when you deploy)

## Troubleshooting

### Error: "No connection could be made"
- **Cause**: MongoDB is not running or not accessible
- **Solution**:
  - Check if MongoDB service is running: `docker ps` (for Docker) or `systemctl status mongod` (for local)
  - Verify environment variables are loaded: restart your dev server
  - Test connection string manually

### Error: "Authentication failed"
- **Cause**: Wrong username/password or auth source
- **Solution**:
  - Verify credentials in `.env` file
  - Check `MONGODB_AUTH_SOURCE` (usually `admin`)
  - For MongoDB Atlas, ensure IP whitelist includes your IP

### Error: "Database 'soc' not found"
- **Cause**: Database doesn't exist yet
- **Solution**: MongoDB will create it automatically on first write. Ensure you have at least one client document.

## Next Steps

1. **Restart your Next.js dev server** to load new environment variables:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Verify MongoDB connection** by trying IP sweep again

3. **Add test client data** if needed:
   - Go to `/admin/clients`
   - Add at least one client with `fw_index` field

## For Production Deployment

When deploying to production/Docker:

1. Use environment-specific `.env` files:
   - `.env.development` (local)
   - `.env.production` (Docker/K8s)

2. Use Docker secrets for sensitive data:
   ```yaml
   secrets:
     mongodb_password:
       external: true
   ```

3. Use health checks:
   ```yaml
   healthcheck:
     test: ["CMD", "python", "-c", "from pymongo import MongoClient; MongoClient('${MONGODB_URI}').server_info()"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

4. Consider using connection pooling for better performance
