# Project File Map and Working Overview

This document provides a high-level map of the project structure and a summary of the purpose and working of each major folder/file.

---

## Root Directory

- **package.json / package-lock.json**: Node.js/Next.js project dependencies and scripts.
- **next.config.js**: Next.js configuration.
- **tsconfig.json**: TypeScript configuration.
- **tailwind.config.js / postcss.config.js**: Tailwind CSS and PostCSS configuration for styling.
- **public/**: Static assets (images, icons, etc.) served by Next.js.
- **pages/**: Next.js pages (routes, API endpoints, etc.).
- **components/**: React components for UI.
- **styles/**: CSS/SCSS files for global and component styles.
- **lib/**: Utility libraries (e.g., database, authentication helpers).
- **models/**: Mongoose or other data models for MongoDB.
- **contexts/**: React context providers for state management.
- **.env**: Environment variables (not committed).
- **.dockerignore / Dockerfile**: Docker configuration for building and running the app.
- **README.md**: Main project documentation.

---

## backend(just folder name is backend)/

- **Purpose**: Contains Python scripts for automation, advisory generation, and enrichment. Not a running backend server, but a set of tools/scripts.
- **requirements.txt**: Python dependencies for backend scripts.
- **main.py**: Main entry point for backend automation utilities.
- **generate_advisories.py**: Script to generate threat advisories (called by frontend API or manually).
- **config.yaml**: Configuration for feeds, LLM, and other backend settings.
- **collectors/**: Python modules for fetching RSS feeds, articles, MITRE mapping, etc.
- **llm/**: Python modules for LLM (Large Language Model) integration and summarization.
- **renderer/**: Python modules for rendering HTML advisories.
- **enrichment/**: Data enrichment modules (e.g., recommendations, CVSS scoring).
- **utils/**: Common utility functions for backend scripts.
- **templates/**: Jinja2 HTML templates for rendering advisories.
- **workspace/**: Output directory for generated advisories (HTML/JSON).
- **logs/**: Log files for backend script runs.

---

## How It Works

- The Next.js app (root) serves the frontend and API routes.
- When a user/admin triggers advisory generation (e.g., via /api/auto-feed), the API route runs a Python script from backend/ (e.g., generate_advisories.py).
- The Python script fetches threat data, processes it, generates advisories, and outputs results (HTML/JSON) to backend/workspace/.
- The frontend can display these advisories or use the generated data as needed.

---

## Example Workflow

1. User/admin triggers advisory generation from the frontend.
2. Next.js API route (pages/api/auto-feed.ts) spawns backend/generate_advisories.py.
3. Python script fetches, analyzes, and generates advisories.
4. Results are saved to backend/workspace/ and returned to the frontend.
5. Frontend displays advisories to users/admins.

---

For more details, see README.md in the root and backend/ folders.