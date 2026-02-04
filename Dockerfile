# Single-container build: build Next in Node, runtime on Python image with Node runtime

# --- Build stage: Next.js ---
FROM node:20-bullseye-slim AS node_builder
WORKDIR /app
COPY package.json yarn.lock ./
# Keep base ca-certificates for network ops
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN yarn install --frozen-lockfile --production=false
# Copy config files needed for build (including CSS processing configs)
COPY next.config.js tsconfig.json next-env.d.ts .eslintrc.json* ./
COPY postcss.config.js tailwind.config.js ./
COPY components ./components
COPY contexts ./contexts
COPY lib ./lib
COPY models ./models
COPY pages ./pages
COPY public ./public
COPY styles ./styles
# Set dummy environment variables for build-time page generation
# Real values will be provided at runtime via .env.local or docker-compose
ENV MONGODB_URI="mongodb+srv://threatadvisory:dwoCFLCGxMqXzAKq@threatadvisory.atzvfoo.mongodb.net/?appName=ThreatAdvisory" \
    NEXTAUTH_URL="http://localhost:3000" \
    NEXTAUTH_SECRET="build-time-dummy-secret" \
    JWT_SECRET="build-time-dummy-jwt"
RUN yarn build

# --- Runtime stage: Python base with Node runtime installed ---
FROM python:3.9-slim
LABEL maintainer=""
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production
WORKDIR /app

# Install system deps + supervisor + Node.js runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl bash ca-certificates build-essential gcc libffi-dev libxml2-dev libxslt1-dev libjpeg-dev zlib1g-dev libpq-dev git supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend (includes config.yaml inside backend folder)
COPY backend ./backend

# Copy root-level templates folder (required for email generation)
COPY templates ./templates

# Copy built frontend artifacts from builder
COPY --from=node_builder /app/.next ./.next
COPY --from=node_builder /app/public ./public
COPY --from=node_builder /app/package.json ./package.json
COPY --from=node_builder /app/node_modules ./node_modules
COPY --from=node_builder /app/next.config.js ./next.config.js

# Copy PostCSS and Tailwind config files
COPY --from=node_builder /app/postcss.config.js ./postcss.config.js
COPY --from=node_builder /app/tailwind.config.js ./tailwind.config.js
COPY --from=node_builder /app/tsconfig.json ./tsconfig.json

# Copy project frontend source from builder (already processed)
COPY --from=node_builder /app/components ./components
COPY --from=node_builder /app/contexts ./contexts
COPY --from=node_builder /app/lib ./lib
COPY --from=node_builder /app/models ./models
COPY --from=node_builder /app/pages ./pages
COPY --from=node_builder /app/styles ./styles

# Supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose Next.js default port
EXPOSE 3000

# Start supervisord in foreground
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]