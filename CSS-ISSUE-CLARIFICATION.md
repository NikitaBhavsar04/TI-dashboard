# 🔍 CSS Issue Analysis & Deployment Clarification

## **ANSWER 1: Are yarn.lock and Dockerfile Causing CSS Module Load Issues?**

### ✅ **NO - They Are Configured CORRECTLY!**

**Analysis:**

1. **✅ yarn.lock is FINE:**
   - Contains all required CSS packages (tailwindcss, postcss, autoprefixer)
   - Locked versions ensure consistent builds
   - **NOT causing any CSS issues**

2. **✅ Dockerfile is CORRECT:**
   ```dockerfile
   # Line 9: Installs devDependencies (includes tailwindcss, postcss, autoprefixer)
   RUN yarn install --frozen-lockfile --production=false
   
   # Line 25: Builds Next.js (compiles CSS)
   RUN yarn build
   ```
   
   The `--production=false` flag is **CRITICAL** - it installs devDependencies which include:
   - `tailwindcss`
   - `postcss`
   - `autoprefixer`
   
   Without these, CSS compilation would fail!

3. **✅ package.json is CORRECT:**
   ```json
   "devDependencies": {
     "autoprefixer": "^10.4.0",
     "postcss": "^8.4.0",
     "tailwindcss": "^3.3.0"
   }
   ```

4. **✅ postcss.config.js is CORRECT:**
   ```javascript
   module.exports = {
     plugins: {
       tailwindcss: {},
       autoprefixer: {},
     },
   }
   ```

5. **✅ tailwind.config.js is CORRECT:**
   - Properly configured content paths
   - All component directories included

### **The Real CSS Problem (NOT yarn.lock/Dockerfile):**

The CSS issue on AWS was **NOT** caused by module loading problems. It was caused by:

```
Running the app without building it first!
```

**What happened on AWS:**
- You ran: `npm run dev` or `npm start` without `npm run build`
- Next.js did NOT compile Tailwind CSS
- `.next/static/css/` directory was empty
- Browser couldn't load CSS files

**Docker SOLVES this:**
- Dockerfile line 25: `RUN yarn build` ← **Forces build during image creation**
- CSS is compiled BEFORE the container runs
- CSS files are guaranteed to exist

---

## **ANSWER 2: PM2 vs Docker - You Don't Need BOTH!**

### ❌ **DO NOT USE PM2 with Docker!**

**You have TWO deployment options - Choose ONE:**

### **Option A: Docker Deployment (RECOMMENDED)** ⭐

**What it is:**
- Your app runs inside a Docker container
- Supervisord manages processes (not PM2)
- Container auto-restarts via `--restart unless-stopped`

**When to use:**
- You want consistent deployments
- You want to containerize your app
- You have both Next.js + Python backend

**PM2 is NOT needed because:**
- Docker handles process management
- `docker run --restart unless-stopped` auto-restarts on failure
- Supervisord inside container manages Next.js + Python

**How to deploy:**
```bash
# On EC2
docker build -t ti-dashboard:latest .
docker run -d --name threat-advisory -p 3000:3000 --env-file .env.local --restart unless-stopped ti-dashboard:latest
```

**No PM2 needed!**

---

### **Option B: PM2 Deployment (WITHOUT Docker)**

**What it is:**
- Run Next.js directly on EC2 with PM2 managing the process
- NO Docker containers

**When to use:**
- You don't want to use Docker
- You want simpler process management
- You only need Next.js (no Python backend integration)

**How to deploy:**
```bash
# On EC2 (NO DOCKER)
cd TI-dashboard
npm install
npm run build  # ← CRITICAL: Must build first!
pm2 start npm --name "ti-dashboard" -- start
pm2 save
pm2 startup
```

**Docker is NOT used!**

---

### **⚠️ CRITICAL: You CANNOT Mix Both!**

❌ **WRONG:**
```bash
# Build Docker image
docker build -t ti-dashboard .
# Then try to use PM2 inside container ← WRONG!
pm2 start inside-container  # ← This is already handled by supervisord!
```

✅ **RIGHT - Choose ONE:**

**Either:**
```bash
# Docker (supervisord manages processes)
docker run -d --name threat-advisory -p 3000:3000 --restart unless-stopped ti-dashboard:latest
```

**OR:**
```bash
# PM2 (no docker)
npm run build
pm2 start npm -- start
```

---

## **ANSWER 3: Build Workflow - WHERE to Build?**

### **Workflow A: Build Docker Image ON EC2 (Recommended)**

This is what you should do:

```
┌────────────────────────────────────────────┐
│ YOUR LOCAL MACHINE (Development)          │
│                                            │
│ 1. Write code                              │
│ 2. Test locally: npm run dev              │
│ 3. Commit to GitHub                        │
│    git add .                               │
│    git commit -m "update"                  │
│    git push origin main                    │
└────────────────────────────────────────────┘
                  │
                  │ (Code on GitHub)
                  ▼
┌────────────────────────────────────────────┐
│ AWS EC2 INSTANCE (Production)             │
│                                            │
│ 1. Clone from GitHub                       │
│    git clone <repo>                        │
│                                            │
│ 2. Create .env.local                       │
│    nano .env.local                         │
│                                            │
│ 3. Build Docker Image ON EC2              │
│    docker build -t ti-dashboard:latest .  │
│    ↑ THIS IS WHERE BUILD HAPPENS!         │
│                                            │
│ 4. Run Container                           │
│    docker run -d --name threat-advisory   │
│      -p 3000:3000 --env-file .env.local   │
│      --restart unless-stopped             │
│      ti-dashboard:latest                  │
└────────────────────────────────────────────┘
```

**Step-by-step:**
```bash
# ON YOUR LOCAL MACHINE:
git add .
git commit -m "ready for deployment"
git push origin main

# THEN ON EC2:
ssh -i key.pem ubuntu@ec2-ip
cd /home/ubuntu
git clone https://github.com/NikitaBhavsar04/TI-dashboard.git
cd TI-dashboard

# Create .env.local with production values
nano .env.local

# BUILD DOCKER IMAGE (happens on EC2)
docker build -t ti-dashboard:latest .

# RUN CONTAINER
docker run -d \
  --name threat-advisory \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  ti-dashboard:latest
```

**Why build on EC2?**
- ✅ Image is already on the server
- ✅ No need to push large images
- ✅ Uses EC2 resources for building
- ✅ Simpler workflow

---

### **Workflow B: Build Locally & Push to ECR (Advanced)**

**Only use this if:**
- You have slow EC2 instance
- You want CI/CD pipeline
- You're using AWS ECR + ECS

```
┌────────────────────────────────┐
│ YOUR LOCAL MACHINE             │
│                                │
│ 1. Build image locally         │
│    docker build -t app .      │
│                                │
│ 2. Tag for ECR                 │
│    docker tag app [ECR_URI]   │
│                                │
│ 3. Push to ECR                 │
│    docker push [ECR_URI]      │
└────────────────────────────────┘
                │
                ▼
┌────────────────────────────────┐
│ AWS ECR (Image Registry)       │
└────────────────────────────────┘
                │
                ▼
┌────────────────────────────────┐
│ AWS ECS (Run from ECR)         │
│ Pulls image and runs           │
└────────────────────────────────┘
```

**This is MORE complex - only for advanced users!**

---

## **✅ RECOMMENDED WORKFLOW FOR YOU**

Based on your setup, here's exactly what to do:

### **Step 1: On Your Local Machine**
```bash
# Develop and test
npm run dev

# When ready for deployment
git add .
git commit -m "ready for deployment"
git push origin main
```

**DO NOT build Docker image locally!**

---

### **Step 2: On AWS EC2 (First Time Setup)**

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Docker (one-time)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
# Log back in
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Clone repository
cd /home/ubuntu
git clone https://github.com/NikitaBhavsar04/TI-dashboard.git
cd TI-dashboard

# Create production environment file
nano .env.local
# (Paste your production values)

# BUILD DOCKER IMAGE (happens here on EC2)
docker build -t ti-dashboard:latest .

# RUN CONTAINER (NO PM2 NEEDED!)
docker run -d \
  --name threat-advisory \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  ti-dashboard:latest

# Verify
docker ps
docker logs -f threat-advisory
```

---

### **Step 3: Future Updates**

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
cd /home/ubuntu/TI-dashboard

# Pull latest code
git pull origin main

# Stop old container
docker stop threat-advisory
docker rm threat-advisory

# Rebuild image
docker build -t ti-dashboard:latest .

# Run new container
docker run -d \
  --name threat-advisory \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  ti-dashboard:latest

# Check
docker logs -f threat-advisory
```

**Or use the automated script:**
```bash
./deploy.sh
```

---

## **📋 SUMMARY - Your Questions Answered**

### **Q1: Is yarn.lock/Dockerfile causing CSS module load issues?**
**A:** ❌ NO! They are configured correctly. The CSS issue was from not building the app before running it.

### **Q2: Where and when do I run PM2?**
**A:** ❌ You DON'T need PM2 with Docker! Docker handles process management. PM2 is only if you run WITHOUT Docker.

### **Q3: Do I build first locally then clone to EC2?**
**A:** ❌ NO! 
- ✅ Push code to GitHub from local
- ✅ Clone on EC2
- ✅ Build Docker image ON EC2
- ✅ Run container on EC2

---

## **🎯 YOUR EXACT DEPLOYMENT SEQUENCE**

```
1. Local Machine:
   ├── Write code
   ├── Test: npm run dev
   ├── Git push to GitHub
   └── (DO NOT build Docker locally)

2. GitHub:
   └── Code repository

3. AWS EC2:
   ├── Clone from GitHub
   ├── Create .env.local
   ├── docker build ← BUILD HAPPENS HERE!
   └── docker run ← NO PM2 NEEDED!

4. Container Running:
   ├── Supervisord manages processes
   ├── Auto-restart enabled
   └── CSS works because build happened!
```

---

## **🚫 Common Mistakes to AVOID**

❌ Building Docker image on local machine then trying to transfer it
❌ Using PM2 inside Docker container
❌ Running `npm run dev` on AWS instead of using Docker
❌ Forgetting to run `docker build` on EC2
❌ Trying to use both PM2 and Docker together

---

## **✅ Correct Approach**

✅ Push code to GitHub
✅ Clone on EC2
✅ Build Docker image on EC2
✅ Run Docker container (no PM2)
✅ CSS works automatically!

---

**Follow: [DEPLOY-NOW.md](DEPLOY-NOW.md) for exact commands!**
