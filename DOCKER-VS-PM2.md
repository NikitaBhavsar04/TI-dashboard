# Docker vs PM2 - Choose ONE!

## 🔴 WRONG APPROACH (What NOT to Do)

```
Local Machine:
  ├── docker build ❌ (Don't build here!)
  └── Try to transfer to EC2 ❌

EC2:
  ├── docker run
  └── pm2 start ❌ (Conflict! Don't use both!)
```

---

## ✅ CORRECT APPROACH #1: Docker (RECOMMENDED)

```
Local Machine:
  ├── Write code
  ├── npm run dev (test locally)
  └── git push origin main

AWS EC2:
  ├── git clone https://github.com/NikitaBhavsar04/TI-dashboard.git
  ├── cd TI-dashboard
  ├── nano .env.local (create production env)
  ├── docker build -t ti-dashboard:latest .  ✅ BUILD ON EC2!
  └── docker run -d --name threat-advisory -p 3000:3000 --env-file .env.local --restart unless-stopped ti-dashboard:latest

Result:
  ├── Container manages itself
  ├── Auto-restart enabled
  ├── CSS compiled during build
  └── NO PM2 NEEDED! ✅
```

---

## ✅ CORRECT APPROACH #2: PM2 (WITHOUT Docker)

```
Local Machine:
  ├── Write code
  ├── npm run dev (test locally)
  └── git push origin main

AWS EC2:
  ├── git clone https://github.com/NikitaBhavsar04/TI-dashboard.git
  ├── cd TI-dashboard
  ├── npm install
  ├── npm run build  ✅ MUST BUILD FIRST!
  ├── pm2 start npm --name "ti-dashboard" -- start
  ├── pm2 save
  └── pm2 startup

Result:
  ├── PM2 manages process
  ├── Auto-restart enabled
  ├── CSS compiled during npm run build
  └── NO DOCKER USED! ✅
```

---

## 🎯 COMPARISON TABLE

| Feature | Docker Approach | PM2 Approach |
|---------|----------------|--------------|
| **Build command** | `docker build` | `npm run build` |
| **Run command** | `docker run` | `pm2 start npm -- start` |
| **Process manager** | Docker + Supervisord | PM2 |
| **Auto-restart** | `--restart unless-stopped` | PM2 auto-restart |
| **Python backend** | ✅ Included | ❌ Need separate setup |
| **Logs** | `docker logs` | `pm2 logs` |
| **Stop** | `docker stop` | `pm2 stop` |
| **Update** | Rebuild image + rerun | `git pull` + `pm2 restart` |
| **Complexity** | Medium | Low |
| **Isolation** | ✅ Fully isolated | ❌ Runs on host |

---

## 🎯 WHICH SHOULD YOU USE?

### ✅ Use Docker IF:
- You have both Next.js + Python backend
- You want containerization
- You want consistent environments
- You want to learn Docker

### ✅ Use PM2 IF:
- You only have Next.js (no Python)
- You want simple deployment
- You don't want to learn Docker
- You want direct access to files

---

## 📌 YOUR SITUATION → Use Docker!

**Why?**
1. You have Python backend (`backend/` folder)
2. Your Dockerfile already handles both Next.js + Python
3. Supervisord manages both processes
4. More professional deployment

---

## 🚀 YOUR EXACT DEPLOYMENT (STEP BY STEP)

### **On Your Local Machine:**

```powershell
# 1. Make sure your code is ready
npm run dev  # Test locally

# 2. Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 3. DONE on local! Don't build Docker here!
```

### **On AWS EC2 (SSH in):**

```bash
# 1. Clone repository (first time only)
cd /home/ubuntu
git clone https://github.com/NikitaBhavsar04/TI-dashboard.git
cd TI-dashboard

# 2. Create environment file
nano .env.local
# Paste your production variables, save and exit

# 3. Build Docker image (THIS IS WHERE BUILD HAPPENS!)
docker build -t ti-dashboard:latest .
# Wait 5-10 minutes for build to complete

# 4. Run container (NO PM2!)
docker run -d \
  --name threat-advisory \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  ti-dashboard:latest

# 5. Verify it's working
docker ps  # Should see container running
docker logs -f threat-advisory  # Check logs

# 6. Check CSS files exist (CRITICAL!)
docker exec -it threat-advisory ls -la /app/.next/static/css/
# Should see .css files like: abc123.css

# 7. Test in browser
# http://YOUR_EC2_IP:3000
# Should see app with CSS working!
```

---

## 🔄 UPDATING YOUR APP

### **When you make changes:**

```bash
# Local:
git add .
git commit -m "update"
git push origin main

# EC2:
ssh -i key.pem ubuntu@ec2-ip
cd /home/ubuntu/TI-dashboard
git pull origin main
docker stop threat-advisory
docker rm threat-advisory
docker build -t ti-dashboard:latest .
docker run -d --name threat-advisory -p 3000:3000 --env-file .env.local --restart unless-stopped ti-dashboard:latest
docker logs -f threat-advisory
```

**Or just run:**
```bash
./deploy.sh
```

---

## ❓ FAQ

### Q: Can I build Docker image locally to save EC2 resources?
**A:** You can, but it's more complex. You'd need to push to Docker Hub or AWS ECR. Easier to build on EC2.

### Q: Why can't I use PM2 with Docker?
**A:** Docker container already has supervisord managing processes. PM2 would conflict. You only need one process manager.

### Q: Do I need to install Node.js on EC2?
**A:** NO! Docker image contains Node.js. You only need Docker installed on EC2.

### Q: Where does CSS get compiled?
**A:** During `docker build` command (line 25 of Dockerfile: `RUN yarn build`)

### Q: Can I skip building and just run the container?
**A:** NO! You must build the image first. `docker build` is what compiles your CSS.

---

## ✅ FINAL ANSWER

### **Your Questions:**

1. **"Is yarn.lock/Dockerfile causing CSS module load issues?"**
   - ❌ NO! They're correctly configured. CSS issue was from not building.

2. **"Where and when do I run PM2?"**
   - ❌ DON'T use PM2 with Docker! Choose one or the other.
   - If using Docker → No PM2 needed
   - If using PM2 → No Docker needed

3. **"Build first then clone to EC2?"**
   - ❌ NO! 
   - ✅ Push code to GitHub
   - ✅ Clone on EC2  
   - ✅ Build on EC2
   - ✅ Run on EC2

---

**Next Step:** Follow [DEPLOY-NOW.md](DEPLOY-NOW.md) for exact commands!
