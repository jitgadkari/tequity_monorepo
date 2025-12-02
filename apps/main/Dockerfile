# Tequity Main App Dockerfile
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

# Generate Prisma client
RUN corepack enable pnpm && cd apps/main && npx prisma generate

# Build with turbo
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy OPENAI_API_KEY for build time - OpenAI SDK validates key exists even in lazy init
ENV OPENAI_API_KEY="sk-dummy-build-time-key"
RUN corepack enable pnpm && pnpm turbo build --filter=@tequity/main

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/apps/main/public ./apps/main/public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/static ./apps/main/.next/static

# Copy Prisma clients from builder (standalone should include them, but be safe)
# The generated Prisma clients are at @prisma/master-client and @prisma/tenant-client
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/main/server.js"]
