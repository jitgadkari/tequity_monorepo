# Tequity Admin App Dockerfile
# Multi-stage build for optimized production image
# Using Debian slim instead of Alpine for better native module compatibility (lightningcss, etc.)

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies - copy everything and install
FROM base AS deps
COPY . .
RUN corepack enable pnpm && pnpm install --no-frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./

# Build with turbo
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm turbo build --filter=@tequity/admin

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy public assets (if exists)
COPY --from=builder /app/apps/admin/public ./apps/admin/public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin/server.js"]
