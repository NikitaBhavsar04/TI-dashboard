
# EaglEye IntelDesk — Threat Intelligence Platform

A full-stack cybersecurity threat intelligence and advisory platform. The frontend, REST API, and admin dashboard are all built with Next.js (TypeScript). Automated advisory generation is handled by a Python pipeline in `backend/`. Production domain: **inteldesk.eagleyesoc.ai**

---

## Features

- AI-powered threat advisory generation from 50+ RSS feeds
- Automated MITRE ATT&CK mapping, CVE extraction, and LLM summarization
- Role-based access control (super_admin / admin / user)
- Email scheduling with open/click tracking
- Google Apps Script cloud email scheduler (24/7, survives server restarts)
- Raw articles feed with full-text search
- Pixel-based email open tracking with analytics dashboard
- Docker + Nginx + PM2 production deployment
- JWT authentication (HTTP-only cookies), bcrypt password hashing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & API | Next.js 14, React, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | JWT, bcryptjs |
| Automation | Python 3 (backend/) |
| LLM | OpenRouter API (DeepSeek / Llama / Gemini) or local Ollama |
| Email | Nodemailer + Gmail SMTP or Google Apps Script |
| Containerization | Docker, Docker Compose |
| Reverse Proxy | Nginx |
| Process Manager | PM2 or supervisord |

---

## Role-Based Access Control

Three roles with hierarchy: `super_admin` (3) > `admin` (2) > `user` (1)

| Role | Access |
|---|---|
| `user` | Redirected to `/admin/eagle-nest` on login; Eagle Nest view only |
| `admin` | Full operational access; can create `user` roles only |
| `super_admin` | Complete system access; can create all role types |

Use `RoleProtected` component to wrap restricted routes:
```tsx
<RoleProtected requiredRole="admin">
  <AdminPage />
</RoleProtected>
```

Test accounts (all password: `password123`):
- `testuser@example.com` (user)
- `testadmin@example.com` (admin)
- `testsuperadmin@example.com` (super_admin)

---

## Getting Started

### 1. Clone & install
```bash
git clone https://github.com/hackelite01/Threat-Advisory.git
cd Threat-Advisory
npm install
```

### 2. Environment variables
Create `.env.local` in the project root:
```env
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/soc
JWT_SECRET=your_jwt_secret_key_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youraddress@gmail.com
SMTP_PASS=abcdefghijklmnop      # 16-char App Password, no spaces
SMTP_FROM=youraddress@gmail.com

# Optional
APPS_SCRIPT_URL=https://script.google.com/macros/s/<ID>/exec
CRON_SECRET=your_cron_secret
PYTHON_PATH=/usr/bin/python3
ADVISORY_API_URL=http://localhost:8000/generate-advisory
NODE_ENV=development

# Production
NEXT_PUBLIC_APP_URL=https://inteldesk.eagleyesoc.ai
ALLOWED_ORIGINS=https://inteldesk.eagleyesoc.ai
SECURITY_HEADERS=true
FORCE_HTTPS=true
```

Create `backend/.env`:
```env
HF_API_KEY=your_huggingface_api_key
OPENROUTER_API_KEY=your_openrouter_api_key   # primary LLM
OPENAI_API_KEY=your_openai_key               # optional
LOG_LEVEL=INFO
```

### 3. Python backend setup
```bash
cd backend
.\setup.ps1          # Windows
# or manually:
python -m venv venv
pip install -r requirements.txt
```

### 4. Run development server
```bash
npm run dev
# Open http://localhost:3000
```

---

## Database — MongoDB Collections

Active database: `soc` (set in `MONGODB_URI`)

| Collection | Contents |
|---|---|
| `advisories` | Generated and manual threat advisories |
| `agendaJobs` | Agenda.js email scheduler jobs |
| `auditlogs` | Every user action (login, view, send, etc.) |
| `clients` | Client records with email lists |
| `emailTracking` | Email open/read events (pixel tracking) |
| `scheduledemails` | Scheduled emails (pending / sent / failed) |
| `loginattempts` | Failed login records |
| `users` | User accounts with roles |

MongoDB supports both full URI and component-based env vars (`MONGODB_HOST`, `MONGODB_PORT`, `MONGODB_USER`, `MONGODB_PASSWORD`, `MONGODB_DB`).

---

## Auto-Advisory Generation

### How it works

1. **RSS Fetch** — `collectors/feeds.py` monitors 50+ feeds (The Hacker News, Bleeping Computer, CISA, SANS, Security Week, etc.)
2. **Deduplication** — `backend/workspace/seen_items.json` tracks processed articles
3. **Content Extraction** — `collectors/page.py` extracts up to 15,000 chars per article
4. **LLM Summarization** — `llm/summarize.py` calls OpenRouter API
5. **MITRE Mapping** — `collectors/mitre.py` maps tactics/techniques
6. **Rendering** — `renderer/render.py` produces Jinja2 HTML
7. **Save** — Output written to `backend/workspace/SOC-TA-*.html` and `.json`, then saved to MongoDB

Advisory ID format: `SOC-TA-YYYYMMDD-HHMM-NN`

Advisory fields: `title`, `severity`, `TLP`, `executiveSummary`, `affectedProducts`, `vendor`, `cveIds`, `mitreTactics`, `recommendations`, `patchDetails`, `references`, `targetSectors`, `regions`

### Trigger from frontend

Click the **Auto Advisory** button (⚡) on the Advisories page, or call:
```bash
POST /api/auto-feed
Body: { "maxItems": 3 }
# JWT cookie required; admin only
```

Default: 3 advisories, takes 60–90 seconds.

### Trigger from CLI
```bash
python backend/generate_advisories.py 3   # generate 3 advisories
```

### Serve generated HTML files
Generated HTML files are accessible at:
```
http://localhost:3000/backend/workspace/<filename>.html
# or
http://localhost:3000/api/workspace/<filename>.html
```

### Troubleshooting
| Problem | Fix |
|---|---|
| "No new items" | Delete `backend/workspace/seen_items.json` |
| Slow generation | Reduce `maxItems` in frontend call |
| LLM errors | Check `OPENROUTER_API_KEY` in `backend/.env` |
| Python not found | Set `PYTHON_PATH` in `.env.local` |

---

## LLM Configuration

Edit `backend/config.yaml`:

```yaml
openrouter:
  enabled: true
  model: tngtech/deepseek-r1t-chimera:free   # current default (free)

# Free alternative models:
# meta-llama/llama-3.2-3b-instruct:free
# google/gemini-flash-1.5:free
# microsoft/phi-3-mini-128k-instruct:free
# mistralai/mistral-7b-instruct:free

ollama:
  enabled: false     # set true for local LLM
  model: llama3

max_advisories_per_run: 3
```

Monitor OpenRouter usage: [openrouter.ai/activity](https://openrouter.ai/activity)

After changing config: restart `npm run dev`.

---

## Email System

### Gmail SMTP Setup

1. Enable 2FA on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Create an App Password for "Threat Advisory System"
4. Set `SMTP_PASS=abcdefghijklmnop` (16 chars, no spaces) in `.env.local`
5. Best practice: rotate every 90 days

Test SMTP: `node test-smtp-config.js`

### Google Apps Script Cloud Scheduler (Optional)

For 24/7 email scheduling that survives server restarts (100 emails/day free):

1. Go to [script.google.com](https://script.google.com) → New Project
2. Paste `google-apps-script/Code.gs` and authorize Gmail permissions
3. Deploy as Web App: Execute as **Me**, access **Anyone**
4. Copy deployment URL → add to `.env.local`:
   ```env
   APPS_SCRIPT_URL=https://script.google.com/macros/s/<ID>/exec
   ```
5. Health check: `GET <APPS_SCRIPT_URL>` → `{ "status": "online" }`

System auto-selects Apps Script if `APPS_SCRIPT_URL` is set; falls back to Agenda.js otherwise.

### Email Tracking

- Tracking pixel URL: `GET /api/emails/tracking?t=TRACKING_ID&type=open` — returns 1×1 transparent PNG
- Events API: `GET /api/tracking/events?timeRange=24h`
- Dashboard: `/analytics/email-tracking` — auto-refreshes every 30 seconds
- Shows: total sent, open rate, click rate, unique openers, recent activity
- Email client note: Gmail and Outlook work with images enabled; plain-text clients block pixels

Tracking ID: 64-char random hex (256-bit entropy via `crypto.randomBytes(32)`).

---

## Raw Articles Feed

- **UI** at `/admin/raw-articles`: search by title/source/summary/CVE; filter by status (NEW / PROCESSED / REJECTED)
- `GET /api/raw-articles` — returns articles from `backend/workspace/raw_articles.json` + count + last fetched
- `POST /api/raw-articles/fetch` — runs `raw_article_fetcher.py` (admin auth required); 8-thread workers, last 14 days
- Deduplication by URL hash; seen IDs in `backend/workspace/seen_items_rss.json`

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/profile` | Get current user profile |

### Advisories
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/advisories` | List all advisories |
| POST | `/api/advisories` | Create advisory |
| GET | `/api/advisories/[id]` | Get advisory by ID |
| PUT | `/api/advisories/[id]` | Update advisory |
| DELETE | `/api/advisories/[id]` | Delete advisory |
| POST | `/api/auto-feed` | Trigger automated advisory generation |

### Email
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/emails/send-advisory` | Send advisory email |
| GET | `/api/emails/schedule-via-apps-script` | Schedule via Apps Script |
| GET | `/api/emails/cancel-scheduled` | Cancel scheduled email |
| GET | `/api/emails/check-scheduled-status` | Check scheduled email status |
| GET | `/api/track-email/[trackingId]` | Email open tracking pixel |
| GET | `/api/tracking/events` | Email analytics events |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/raw-articles` | Raw articles list |
| POST | `/api/raw-articles/fetch` | Trigger raw article fetch |
| GET | `/api/workspace/[filename]` | Serve generated HTML files |
| GET | `/api/health` | Health check |
| POST | `/api/cron/process-emails` | Vercel cron email processor |

---

## Project Structure

```
TI-dashboard/
├── pages/               # Next.js pages and API routes
│   ├── api/             # API endpoints (auth, advisories, email, etc.)
│   ├── admin/           # Admin dashboard pages
│   └── advisories/      # Advisory views
├── components/          # React components
│   ├── RoleProtected.tsx
│   ├── ScheduledEmailsManager.tsx
│   └── ...
├── lib/                 # Shared utilities (agenda.js, appsScriptScheduler.js, etc.)
├── models/              # Mongoose schemas (Advisory, User, ScheduledEmail, etc.)
├── contexts/            # React contexts (auth, toast)
├── styles/              # Global CSS
├── templates/           # Email HTML templates
├── google-apps-script/  # Apps Script source (Code.gs)
├── backend/             # Python automation (not a server)
│   ├── generate_advisories.py   # Main entry point
│   ├── config.yaml              # LLM, feeds, limits config
│   ├── requirements.txt
│   ├── collectors/              # RSS, page, MITRE, IP sweep
│   ├── llm/                     # OpenRouter / Ollama interface
│   ├── renderer/                # Jinja2 HTML rendering
│   ├── enrichment/              # CVE, threat enrichment
│   ├── utils/                   # Helpers, logging
│   ├── templates/               # Jinja2 templates
│   ├── workspace/               # Generated output (HTML, JSON, cache)
│   └── data/cache/              # Feed dedup cache
├── public/              # Static assets
├── docker-compose.yml
├── Dockerfile
├── supervisord.conf
└── vercel.json
```

---

## Deployment

### Docker (Recommended for full-stack with Python backend)

```bash
docker build -t ti-dashboard:latest .
docker run -d -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  --name threat-advisory \
  ti-dashboard:latest
```

`supervisord` manages both Next.js and Python inside the container.

**Update workflow:**
```bash
git pull
docker stop threat-advisory && docker rm threat-advisory
docker build -t ti-dashboard:latest .
docker run ... (same as above)
```

Verify CSS compiled: `docker exec -it threat-advisory ls /app/.next/static/css/`

### AWS EC2 + Nginx + PM2

**Server:** Ubuntu 22.04 LTS on `t3.xlarge` (4 vCPU, 16 GB RAM, 100–200 GB gp3)

```bash
# Build & start with PM2
npm run build
pm2 start npm --name inteldesk-eagleyesoc -- start
pm2 save && pm2 startup
```

PM2 config: `PORT: 3001`, `max_memory_restart: '1G'`, autorestart.

**Nginx** proxies HTTP→HTTPS and forwards to `localhost:3001`:
```nginx
location / { proxy_pass http://localhost:3001; }
location /api/ { proxy_pass http://localhost:3001; proxy_read_timeout 60s; }
add_header X-Frame-Options DENY;
add_header Strict-Transport-Security "max-age=31536000";
```

**SSL:** Let's Encrypt via certbot: `certbot --nginx -d inteldesk.eagleyesoc.ai`  
Auto-renewal cron: `0 12 * * *`

**DNS (GoDaddy):** A record `inteldesk → EC2 IP`

**Estimated AWS cost:** ~$400–600/month (EC2 + Atlas M10 + OpenSearch + ALB)

### Vercel (Frontend only)

```env
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
CRON_SECRET=your_cron_secret
MONGODB_URI=mongodb+srv://...   # Atlas must allow 0.0.0.0/0
```

Vercel Cron: `POST /api/cron/process-emails` every 10 minutes (add to `vercel.json`).

**DNS (GoDaddy):** A record `@ → 76.76.19.61`, CNAME `www → cname.vercel-dns.com`

> Note: Python backend scripts cannot run on Vercel serverless. Use a separate VM or Railway for full-stack.

### Railway

Connect GitHub → set env vars → deploy. Supports background services and MongoDB hosting.  
Pricing: $5/month (Starter), $20/month (Pro).

---

## AWS Infrastructure Sizing

| Component | Spec | Cost/month |
|---|---|---|
| EC2 | t3.xlarge, Ubuntu 22.04, 100–200 GB gp3 | ~$120 |
| MongoDB Atlas | M10 cluster, 2–8 GB RAM, 100 GB | ~$60–100 |
| OpenSearch | t3.medium.search × 2–3 nodes, 100–200 GB/node | ~$150–250 |
| ALB + networking | VPC, NAT, data transfer | ~$30–50 |
| **Total** | | **~$400–600** |

Security groups: ALB (80/443 open), App server (3000 from ALB only), MongoDB (27017 from App only).

---

## UI Features

- **RippleButton**: material design ripple, variants: primary / secondary / success / danger
- **Toast notifications**: `useToast()` hook — 4 types, auto-dismiss 4s, stackable
- **Skeleton loaders**: `SkeletonLoader`, `CardSkeleton`, `TableSkeleton` with shimmer
- **Page transitions**: Framer Motion fade + vertical slide (400ms) in `_app.tsx`
- **CSS utilities**: `.stagger-item`, `.btn-enhanced`, `.card-animated`, `.skeleton`, `.card-hover-enhanced`
- Dark cyber aesthetic: neon accents, monospace fonts, glitch effects, terminal-style components

---

## Email Template

Advisory emails contain:
- **Recommendations** (green gradient): strategic guidance
- **Patch Details** (purple gradient): specific versions, install commands
- **Advisory Metadata** (gray gradient): TLP color coding, dates, regions, advisory ID
- MITRE ATT&CK tactics table, affected products/sectors badges, IOC table
- Size: ~35–40 KB; mobile-responsive, cyber-themed branding

---

## Security

- All passwords hashed with bcrypt
- JWT tokens in HTTP-only cookies (no JS access)
- Server-side authentication on every protected route
- Input validation and XSS protection on all API endpoints
- Role hierarchy enforced both in UI and API layer
- NGINX security headers: `X-Frame-Options DENY`, `HSTS`, `X-Content-Type-Options`

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

> **Disclaimer**: This platform is designed for cybersecurity professionals. Ensure proper security measures are in place before deploying to production.
