# =====================================
# StockSense — Production Dockerfile
# =====================================
# Multi-stage build: builder → runner

# ---- Stage 1: Build ----
FROM node:18-alpine AS builder

WORKDIR /app

# Install deps first (Docker layer caching)
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy source
COPY . .

# Build production Next.js app
RUN npm run build

# ---- Stage 2: Runner ----
FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only required artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy local JSON database (initial seed data)
COPY --from=builder /app/data ./data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
