# 🚀 Railway Deployment Guide

## Prerequisites
- GitHub repository with your code
- Railway account (railway.app)

## Step-by-Step Deployment

### 1. **Setup Railway**
```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login to Railway
railway login
```

### 2. **Deploy to Railway**

#### Option A: GitHub Integration (Recommended)
1. Go to [railway.app](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Select your repository: `hackelite01/Threat-Advisory`
4. Railway will auto-detect it as a Next.js app

#### Option B: CLI Deployment
```bash
# In your project directory
railway login
railway init
railway up
```

### 3. **Configure Environment Variables**
In Railway dashboard, add these environment variables:

```env
# Database
MONGODB_URI=mongodb://mongo:27017/threat-advisory

# Authentication
NEXTAUTH_URL=https://your-app.railway.app
NEXTAUTH_SECRET=your-production-secret-key-here
JWT_SECRET=your-jwt-secret-here

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mayank@forensiccybertech.com
SMTP_PASS=yuva_inwm_snxm_juof

# Environment
NODE_ENV=production
```

### 4. **Add MongoDB Service**
1. In Railway dashboard, click "New"
2. Select "Database" → "MongoDB"
3. Note the connection string
4. Update MONGODB_URI in environment variables

### 5. **Deploy**
- Railway will automatically deploy on every push to main branch
- Monitor deployment in Railway dashboard
- Check logs for any issues

## 🔗 Your App URLs
- **Main App:** `https://your-app-name.railway.app`
- **Health Check:** `https://your-app-name.railway.app/api/health`
- **Admin Panel:** `https://your-app-name.railway.app/admin`

## 📊 Production Checklist
- [ ] Environment variables configured
- [ ] Database connected
- [ ] Email service working
- [ ] Health check responding
- [ ] SSL certificate active
- [ ] Domain configured (optional)

## 🛠 Troubleshooting
- Check Railway logs for build/runtime errors
- Verify environment variables are set correctly
- Test database connection via health check endpoint
- Ensure email credentials are valid

## 💰 Pricing
- **Starter Plan:** $5/month
- **Pro Plan:** $20/month
- Usage-based billing for resources

## 🔄 CI/CD
Railway automatically:
- Builds on every push to main
- Runs tests (if configured)
- Deploys if successful
- Provides deployment previews for PRs
