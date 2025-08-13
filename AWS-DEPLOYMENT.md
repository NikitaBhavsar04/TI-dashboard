# 🚀 AWS Deployment Guide - inteldesk.eagleyesoc.ai

## 🎯 **Deployment Overview**
- **Domain:** inteldesk.eagleyesoc.ai
- **Platform:** AWS Instance (alongside existing Next.js project)
- **Database:** MongoDB Atlas (already configured)
- **Email:** SMTP via Gmail

## 📋 **Pre-Deployment Checklist**
- [x] MongoDB Atlas configured with data migrated
- [x] Domain configuration updated in codebase
- [x] SMTP credentials configured
- [x] Environment variables prepared

## 🔧 **AWS Instance Deployment Steps**

### **Step 1: Connect to Your AWS Instance**
```bash
# SSH to your AWS instance
ssh -i your-key.pem ubuntu@your-aws-ip

# Navigate to web directory
cd /var/www/
```

### **Step 2: Clone and Setup Project**
```bash
# Clone your repository
sudo git clone https://github.com/hackelite01/Threat-Advisory.git inteldesk
cd inteldesk

# Install dependencies
sudo npm install

# Copy environment configuration
sudo cp .env.production .env.local
```

### **Step 3: Build for Production**
```bash
# Build the application
sudo npm run build

# Test the build
sudo PORT=3001 npm start
```

### **Step 4: Configure Process Manager (PM2)**
```bash
# Install PM2 if not already installed
sudo npm install -g pm2

# Create PM2 ecosystem file
sudo nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'inteldesk-eagleyesoc',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/inteldesk',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
```

```bash
# Start application with PM2
sudo pm2 start ecosystem.config.js
sudo pm2 startup
sudo pm2 save
```

### **Step 5: Configure Nginx Reverse Proxy**

```bash
# Edit nginx configuration
sudo nano /etc/nginx/sites-available/inteldesk
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name inteldesk.eagleyesoc.ai;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name inteldesk.eagleyesoc.ai;

    # SSL Configuration (you'll need to obtain SSL certificates)
    ssl_certificate /etc/ssl/certs/inteldesk.eagleyesoc.ai.crt;
    ssl_certificate_key /etc/ssl/private/inteldesk.eagleyesoc.ai.key;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Proxy to Next.js application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API routes with longer timeout
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/inteldesk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Step 6: SSL Certificate Setup**

#### **Option A: Let's Encrypt (Free)**
```bash
# Install certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d inteldesk.eagleyesoc.ai

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### **Option B: Manual Certificate**
```bash
# If you have your own SSL certificates
sudo mkdir -p /etc/ssl/certs/
sudo mkdir -p /etc/ssl/private/
sudo cp your-certificate.crt /etc/ssl/certs/inteldesk.eagleyesoc.ai.crt
sudo cp your-private-key.key /etc/ssl/private/inteldesk.eagleyesoc.ai.key
sudo chmod 600 /etc/ssl/private/inteldesk.eagleyesoc.ai.key
```

### **Step 7: DNS Configuration (GoDaddy)**

In your GoDaddy DNS management:
```dns
Type: A
Name: inteldesk
Value: YOUR_AWS_INSTANCE_IP
TTL: 1 Hour

Type: CNAME (optional for www)
Name: www.inteldesk
Value: inteldesk.eagleyesoc.ai
TTL: 1 Hour
```

### **Step 8: Environment Variables**

Create `/var/www/inteldesk/.env.local`:
```bash
# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=threatintelligence@forensiccybertech.com
SMTP_PASS=hbts_qbew_cwsm_gapf

# JWT Secret
JWT_SECRET=ultra-secure-jwt-secret-key-for-production-threatwatch-2024-forensic-cyber-tech

# Application Settings
NODE_ENV=production
NEXTAUTH_URL=https://inteldesk.eagleyesoc.ai
NEXT_PUBLIC_APP_URL=https://inteldesk.eagleyesoc.ai
ALLOWED_ORIGINS=https://inteldesk.eagleyesoc.ai,https://www.inteldesk.eagleyesoc.ai

# Security
CRON_SECRET=super-secure-cron-secret-key-2024-aws-deployment
SECURITY_HEADERS=true
FORCE_HTTPS=true
```

## 🔄 **Background Jobs Setup**

### **Option A: Keep Agenda.js (Original)**
Your existing agenda.js system will work perfectly on AWS:
```bash
# The background jobs will run automatically
# Email scheduling will work as designed
```

### **Option B: Cron Jobs for Email Processing**
```bash
# Add to crontab for email processing
sudo crontab -e

# Add this line for every 10 minutes
*/10 * * * * curl -X POST -H "Authorization: Bearer super-secure-cron-secret-key-2024-aws-deployment" https://inteldesk.eagleyesoc.ai/api/cron/process-emails
```

## ✅ **Verification Steps**

### **1. Test Application**
```bash
# Check if PM2 is running
pm2 status

# Check application logs
pm2 logs inteldesk-eagleyesoc

# Test locally
curl http://localhost:3001/api/health
```

### **2. Test Domain**
```bash
# Test SSL and domain
curl -I https://inteldesk.eagleyesoc.ai

# Test API endpoints
curl https://inteldesk.eagleyesoc.ai/api/health
```

### **3. Monitor Performance**
```bash
# Monitor with PM2
pm2 monit

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🛠 **Troubleshooting**

### **Common Issues:**

1. **Port Conflicts:**
```bash
# Check what's using ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3001
```

2. **Permission Issues:**
```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/inteldesk
sudo chmod -R 755 /var/www/inteldesk
```

3. **Database Connection:**
```bash
# Test MongoDB connection
node -e "
const mongoose = require('mongoose');
mongoose.connect('your-mongo-uri')
  .then(() => console.log('Connected!'))
  .catch(err => console.error('Error:', err));
"
```

## 🚀 **Quick Deployment Commands**

```bash
# Complete deployment in one go
cd /var/www/
sudo git clone https://github.com/hackelite01/Threat-Advisory.git inteldesk
cd inteldesk
sudo npm install
sudo cp .env.production .env.local
sudo npm run build
sudo pm2 start ecosystem.config.js
sudo systemctl reload nginx
```

## 📊 **Post-Deployment**

Your threat advisory platform will be accessible at:
- **🌐 Main Site:** https://inteldesk.eagleyesoc.ai
- **⚕️ Health Check:** https://inteldesk.eagleyesoc.ai/api/health
- **👨‍💼 Admin Panel:** https://inteldesk.eagleyesoc.ai/admin

**Your professional threat intelligence platform is ready for production use!** 🎉
