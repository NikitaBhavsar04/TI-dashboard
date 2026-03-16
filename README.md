
# 🛡️ EaglEye IntelDesk INTELLIGENCE PLATFORM

A comprehensive cybersecurity threat advisory platform built with Next.js (frontend, API, and admin), and Python scripts for automated threat intelligence advisory generation.


## 🚀 Features

### Core Functionality
- **Threat Advisory Management**: Create, view, and manage security advisories
- **Automated Advisory Generation**: Python scripts fetch, analyze, and summarize threat intelligence
- **Secure Authentication**: JWT-based authentication with HTTP-only cookies
- **Role-Based Access Control**: Admin and User roles
- **Responsive Cyber-Themed UI**: Modern, dark, and technical design
- **MongoDB Integration**: Secure data storage

### Security Features
- Protected routes and server-side authentication
- Passwords hashed with bcrypt
- JWT tokens in HTTP-only cookies
- Input validation and sanitization

### User Roles
- **Admin**: Manage advisories and users, access admin dashboard
- **User**: View advisories after authentication


## 🛠️ Tech Stack

- **Frontend & API**: Next.js (React, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT, bcryptjs
- **Automation**: Python 3 scripts (backend/)
- **Containerization**: Docker


## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/hackelite01/Threat-Advisory.git
cd Threat-Advisory
```

### 2. Install Node.js dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

### 4. Install Python dependencies (for backend scripts)
```bash
cd backend
pip install -r requirements.txt
```

### 5. Run the development server
```bash
npm run dev
```

### 6. Open your browser
Go to `http://localhost:3000`


## 🔧 Configuration & Usage

### MongoDB Setup
1. Create a MongoDB database
2. Add your connection string to `.env.local`
3. The application will automatically create the required collections

**Active database:** `test` (default when no database name is specified in the URI)

| Collection | What's stored |
|---|---|
| `advisories` | Advisories saved in MongoDB |
| `agendaJobs` | Agenda.js email scheduler jobs |
| `auditlogs` | Every user action (login, view, send, etc.) |
| `clients` | Client records with email lists |
| `emailTracking` | Email open/read tracking (pixel tracking) |
| `scheduledemails` | Scheduled emails (pending, sent, failed) |
| `loginattempts` | Failed login attempt records |
| `users` | All user accounts (admin, super_admin, user roles) |

### Python Automation Scripts
- All automation and advisory generation scripts are in `backend/`
- Main entry: `backend/generate_advisories.py`
- Configure feeds and LLM in `backend/config.yaml`

### Running Advisory Generation (Manual)
```bash
cd backend
python generate_advisories.py 1
```

### Running Advisory Generation (From Frontend)
- The API route `/api/auto-feed` triggers the Python script and returns results to the frontend.


## 📁 Project Structure

See `file_map.md` for a detailed file/folder map and working overview.


## 🔐 API Endpoints (Selected)

- `/api/auth/login` – User authentication
- `/api/auth/logout` – User logout
- `/api/auth/profile` – Get user profile
- `/api/advisories` – List all advisories
- `/api/advisories/[id]` – Get or update a specific advisory
- `/api/auto-feed` – Triggers backend Python script for advisory generation


## 🎨 UI Theme

- Dark cyber aesthetic with neon accents
- Monospace fonts, glitch effects, and terminal-style components


## 🚀 Deployment

### Docker (Recommended)

Build and run the app with Docker (includes Python for backend scripts):
```bash
docker build -t threat-advisory .
docker run -p 3000:3000 --env-file .env.local threat-advisory
```

### Vercel/Netlify
- You can deploy the Next.js frontend to Vercel/Netlify, but backend Python scripts must be run separately (e.g., on a VM or server).


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 🛡️ Security

- All passwords are hashed using bcrypt
- JWT tokens are stored in HTTP-only cookies
- Server-side authentication validation
- Protected API endpoints
- Input validation and sanitization


## 📞 Support

If you encounter any issues or have questions, please open an issue in the GitHub repository.


---

**⚠️ DISCLAIMER**: This platform is designed for cybersecurity professionals and educational purposes. Ensure proper security measures are in place before deploying to production.
