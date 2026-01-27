# Production Deployment Guide

## 🚀 Quick Start - Docker Deployment (Recommended)

### Prerequisites
- Docker Desktop installed
- Docker Compose installed
- Git (for cloning)

### Step 1: Prepare Environment

```powershell
# Navigate to project
cd C:\Threat-Advisory

# Create .env file from template
Copy-Item backend\.env.template backend\.env

# Edit .env with your values
notepad backend\.env
```

**Required values in .env:**
```env
FLASK_ENV=production
OPENSEARCH_HOST=opensearch
OPENAI_API_KEY=your-key-here
```

### Step 2: Build and Start

```powershell
# Build Docker images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Step 3: Verify Deployment

```powershell
# Health check
curl http://localhost:8000/health

# Check OpenSearch
curl http://localhost:9200

# Test API endpoint
curl http://localhost:8000/api/feeds/list
```

### Step 4: View Logs

```powershell
# View API logs
docker-compose logs -f api

# View OpenSearch logs
docker-compose logs -f opensearch
```

### Step 5: Stop Services

```powershell
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## 🌐 Cloud Deployment Options

### Option 1: AWS ECS (Elastic Container Service)

#### Prerequisites
- AWS Account
- AWS CLI configured
- ECR repository created

#### Steps

1. **Build and Push Image**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   
   # Tag image
   docker tag threat-advisory-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/threat-advisory-api:latest
   
   # Push to ECR
   docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/threat-advisory-api:latest
   ```

2. **Create ECS Task Definition**
   - Use `aws/ecs-task-definition.json`
   - Configure environment variables
   - Set memory and CPU limits

3. **Create ECS Service**
   - Load balancer configuration
   - Auto-scaling rules
   - Health checks

4. **Configure OpenSearch**
   - Use AWS OpenSearch Service
   - Update OPENSEARCH_HOST in environment

---

### Option 2: Heroku Deployment

#### Prerequisites
- Heroku account
- Heroku CLI installed

#### Steps

1. **Login to Heroku**
   ```bash
   heroku login
   ```

2. **Create App**
   ```bash
   heroku create threat-advisory-api
   ```

3. **Add OpenSearch Add-on**
   ```bash
   # Use Bonsai Elasticsearch (compatible with OpenSearch)
   heroku addons:create bonsai:sandbox-10
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set FLASK_ENV=production
   heroku config:set OPENAI_API_KEY=your-key
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

6. **Verify**
   ```bash
   heroku open
   heroku logs --tail
   ```

---

### Option 3: DigitalOcean App Platform

#### Steps

1. **Create App from GitHub**
   - Connect your repository
   - Select branch (main)

2. **Configure Build**
   - Dockerfile detected automatically
   - Set environment variables in UI

3. **Add Database**
   - Add OpenSearch/Elasticsearch component
   - Configure connection string

4. **Deploy**
   - Click "Deploy"
   - Monitor build logs

---

### Option 4: Traditional VPS (Ubuntu)

#### Prerequisites
- Ubuntu 20.04+ server
- Root or sudo access
- Domain name (optional)

#### Steps

1. **Setup Server**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Clone Repository**
   ```bash
   cd /opt
   sudo git clone https://github.com/yourusername/threat-advisory.git
   cd threat-advisory
   ```

3. **Configure Environment**
   ```bash
   sudo cp backend/.env.template backend/.env
   sudo nano backend/.env
   ```

4. **Start Services**
   ```bash
   sudo docker-compose up -d
   ```

5. **Setup Nginx (Optional)**
   ```bash
   sudo apt install nginx -y
   sudo nano /etc/nginx/sites-available/threat-advisory
   ```

   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/threat-advisory /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Setup SSL with Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d yourdomain.com
   ```

---

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# API health
curl http://your-domain:8000/health

# Database health
curl http://your-domain:8000/api/test_pipeline/db-health
```

### View Logs

```bash
# Docker logs
docker-compose logs -f api

# Gunicorn logs (in container)
docker-compose exec api tail -f /var/log/gunicorn/access.log
```

### Database Backup

```bash
# Backup OpenSearch data
docker-compose exec opensearch opensearch-backup

# Or use volume backup
docker run --rm -v opensearch-data:/data -v $(pwd):/backup ubuntu tar czf /backup/opensearch-backup.tar.gz /data
```

### Update Deployment

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

---

## 🔒 Security Checklist

Before going live:

- [ ] Change all default passwords
- [ ] Set strong SECRET_KEY
- [ ] Restrict CORS_ORIGINS to your domain
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Add authentication (if needed)
- [ ] Regular security updates
- [ ] Enable audit logging
- [ ] Backup strategy in place

---

## 🎯 Performance Tuning

### Gunicorn Workers

```python
# backend/gunicorn_config.py
workers = (CPU_COUNT * 2) + 1  # Adjust based on load
worker_class = 'gevent'  # For async workloads
```

### Database Connection Pool

```python
# Adjust in utils/opensearch_client.py
max_retries = 3
timeout = 30
```

### Caching (Future Enhancement)

- Add Redis for caching
- Cache advisory results
- Cache CVE lookups

---

## 🐛 Troubleshooting Production

### Container Won't Start

```bash
# Check logs
docker-compose logs api

# Check container status
docker-compose ps

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Database Connection Issues

```bash
# Check OpenSearch is running
docker-compose ps opensearch

# Check connectivity
docker-compose exec api curl http://opensearch:9200

# Check environment variables
docker-compose exec api env | grep OPENSEARCH
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Reduce workers in gunicorn_config.py
# Add memory limits in docker-compose.yml
```

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| FLASK_ENV | Yes | development | production/development |
| PORT | No | 8000 | API port |
| CORS_ORIGINS | Yes (prod) | * | Allowed origins |
| OPENSEARCH_HOST | Yes | localhost | OpenSearch host |
| OPENSEARCH_PORT | Yes | 9200 | OpenSearch port |
| OPENAI_API_KEY | Yes (if using) | - | OpenAI API key |
| SECRET_KEY | Yes (prod) | - | Flask secret key |
| WORKERS | No | auto | Gunicorn workers |

---

## 🎉 Post-Deployment

After successful deployment:

1. **Test all endpoints**
   - Use test_endpoints.py
   - Run smoke tests

2. **Monitor logs**
   - Check for errors
   - Monitor performance

3. **Setup alerts**
   - Health check monitoring
   - Error rate alerts
   - Performance alerts

4. **Document your setup**
   - Server details
   - Access credentials
   - Backup procedures

---

## 🔗 Next Steps

1. Deploy frontend (Next.js) to Vercel
2. Configure frontend API endpoint to your production URL
3. Setup CI/CD pipeline (GitHub Actions)
4. Implement authentication
5. Add rate limiting
6. Setup monitoring (DataDog, New Relic, etc.)

---

**Your API is now production-ready! 🚀**
