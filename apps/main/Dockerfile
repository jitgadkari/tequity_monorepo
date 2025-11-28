# Tequity Main App Dockerfile
# Multi-stage build for optimized production image

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/main/package.json ./apps/main/
COPY packages/database/package.json ./packages/database/
COPY packages/utils/package.json ./packages/utils/
COPY packages/types/package.json ./packages/types/
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/main/node_modules ./apps/main/node_modules
COPY . .

# Generate Prisma client
RUN corepack enable pnpm && cd apps/main && npx prisma generate

# Build with turbo
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm turbo build --filter=@tequity/main

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/apps/main/public ./apps/main/public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/static ./apps/main/.next/static

# Copy Prisma client (needed at runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/main/server.js"]
