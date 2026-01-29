# Single-container build: build Next in Node, runtime on Python image with Node runtime

# --- Build stage: Next.js ---
FROM node:18-bullseye-slim AS node_builder
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
# Keep base ca-certificates for network ops
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --legacy-peer-deps; \
    else npm install --legacy-peer-deps; fi
COPY next.config.js ./
COPY components ./components
COPY contexts ./contexts
COPY lib ./lib
COPY models ./models
COPY pages ./pages
COPY public ./public
COPY styles ./styles
RUN npm run build

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
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend and config
COPY backend ./backend
COPY config.yaml ./

# Copy built frontend artifacts from builder
COPY --from=node_builder /app/.next ./.next
COPY --from=node_builder /app/public ./public
COPY --from=node_builder /app/package.json ./package.json
COPY --from=node_builder /app/node_modules ./node_modules
COPY --from=node_builder /app/next.config.js ./next.config.js

# Copy project frontend source (some runtime imports may require files)
COPY components ./components
COPY contexts ./contexts
COPY lib ./lib
COPY models ./models
COPY pages ./pages
COPY styles ./styles

# Supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose Next.js default port
EXPOSE 3000

# Start supervisord in foreground
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]