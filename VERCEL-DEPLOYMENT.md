# 🚀 Vercel Deployment Guide - Threat Advisory Platform

## ✅ Pre-Deployment Checklist
- [x] MongoDB Atlas configured and data migrated
- [x] Email SMTP credentials updated
- [x] Vercel configuration optimized
- [x] Environment variables prepared

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Vercel deployment - serverless optimization"
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Web Interface (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Click "New Project"
4. Import `hackelite01/Threat-Advisory`
5. Configure settings:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

#### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

### Step 3: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
# Database
MONGODB_URI=mongodb+srv://threatadvisory:7U%402dRJagX5kFXE@threatadvisory.atzvfoo.mongodb.net/threat-advisory?retryWrites=true&w=majority

# Authentication
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=super-secure-nextauth-secret-key-for-production-2024-threatwatch
JWT_SECRET=ultra-secure-jwt-secret-key-for-production-threatwatch-2024-forensic-cyber-tech

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=threatintelligence@forensiccybertech.com
SMTP_PASS=hbts_qbew_cwsm_gapf

# Application Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
ALLOWED_ORIGINS=https://your-app-name.vercel.app

# Security
CRON_SECRET=super-secure-cron-secret-key-2024-vercel-deployment
SECURITY_HEADERS=true
FORCE_HTTPS=true
```

### Step 4: Custom Domain Setup (GoDaddy)

#### In Vercel Dashboard:
1. Go to Project → Settings → Domains
2. Add your domain: `yourdomain.com`
3. Add www subdomain: `www.yourdomain.com`

#### In GoDaddy DNS:
1. Login to GoDaddy DNS management
2. Add these records:

```dns
Type: A
Name: @
Value: 76.76.19.61
TTL: 1 Hour

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 1 Hour
```

### Step 5: Verify Deployment

#### Test URLs:
- **Main App:** `https://your-app-name.vercel.app`
- **Health Check:** `https://your-app-name.vercel.app/api/health`
- **Admin Panel:** `https://your-app-name.vercel.app/admin`

#### Test Features:
- [ ] User authentication works
- [ ] Advisory creation and viewing
- [ ] PDF export functionality
- [ ] Email notifications
- [ ] Database connectivity

## 🔄 Email Scheduling on Vercel

Since Vercel is serverless, we've adapted your agenda.js system:

### Automated Email Processing:
- **Cron Job:** Runs every 10 minutes via Vercel Cron
- **Endpoint:** `/api/cron/process-emails`
- **Security:** Protected by CRON_SECRET

### Manual Email Triggers:
- Immediate emails sent on advisory creation
- Scheduled emails processed by cron job
- Retry mechanism for failed emails

## 🛠 Troubleshooting

### Common Issues:

1. **Build Failures:**
   ```bash
   # Check build logs in Vercel dashboard
   # Ensure all dependencies are in package.json
   ```

2. **Database Connection:**
   ```bash
   # Verify MongoDB Atlas allows connections from 0.0.0.0/0
   # Check connection string format
   ```

3. **Environment Variables:**
   ```bash
   # Ensure all required variables are set
   # Check for typos in variable names
   ```

## 📊 Performance Optimization

### Vercel Features Used:
- **Edge Functions** for fast global response
- **Incremental Static Regeneration** for dynamic content
- **Automatic Image Optimization**
- **Built-in CDN** for static assets

### Monitoring:
- **Vercel Analytics** for performance metrics
- **Function logs** for debugging
- **Real User Monitoring** for user experience

## 💰 Cost Estimation

### Vercel Pricing:
- **Hobby (Free):** Perfect for development/low traffic
- **Pro ($20/month):** For production use
  - 100GB bandwidth
  - Unlimited domains
  - Advanced analytics

### Total Monthly Cost:
- **Vercel Pro:** $20/month
- **MongoDB Atlas:** Free (512MB) to $9/month
- **Total:** $20-29/month

## 🔄 Continuous Deployment

### Automatic Deployments:
- **Production:** Deploys from `main` branch
- **Preview:** Deploys from any branch/PR
- **Rollback:** One-click rollback in dashboard

### Deployment Workflow:
```bash
git add .
git commit -m "Feature update"
git push origin main
# Vercel automatically deploys
```

## 🚀 Go Live Checklist

- [ ] Vercel project created and deployed
- [ ] Environment variables configured
- [ ] Custom domain configured (GoDaddy)
- [ ] SSL certificate active
- [ ] Database connectivity verified
- [ ] Email system tested
- [ ] Admin access confirmed
- [ ] Performance testing completed

## 📞 Next Steps After Deployment

1. **Monitor deployment logs**
2. **Test all functionality**
3. **Set up monitoring alerts**
4. **Configure backup strategies**
5. **Plan scaling strategies**

Your threat advisory platform will be live and accessible globally within minutes of deployment!
