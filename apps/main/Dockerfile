# Tequity Main App Dockerfile
# Multi-stage build for optimized production image
# Using Debian slim instead of Alpine for better native module compatibility (lightningcss, etc.)

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies - copy everything and install
FROM base AS deps
COPY . .
RUN corepack enable pnpm && pnpm install --no-frozen-lockfile

# Install infrastructure dependencies (not part of pnpm workspace)
RUN cd infrastructure/tenant-provisioner && npm install --legacy-peer-deps

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./

# Generate Prisma client
RUN corepack enable pnpm && cd apps/main && npx prisma generate

# Build with turbo
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm turbo build --filter=@tequity/main

# Production image - use distroless for smaller size
FROM node:20-slim AS runner
WORKDIR /app

# Install system dependencies required for Prisma and Pulumi
RUN apt-get update && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*

# Install Pulumi CLI
RUN curl -fsSL https://get.pulumi.com | sh && \
    mv /root/.pulumi/bin/* /usr/local/bin/ && \
    rm -rf /root/.pulumi

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOME=/home/nextjs

# Create non-root user with home directory (required for Pulumi)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --create-home --home-dir /home/nextjs nextjs && \
    mkdir -p /home/nextjs/.pulumi && \
    chown -R nextjs:nodejs /home/nextjs

# Copy public assets
COPY --from=builder /app/apps/main/public ./apps/main/public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/static ./apps/main/.next/static

# Copy Prisma clients from builder
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy entire infrastructure tenant-provisioner node_modules (includes all transitive deps)
# This is needed for Pulumi Automation API to work
COPY --from=builder /app/infrastructure/tenant-provisioner/node_modules ./node_modules_pulumi

# Merge Pulumi node_modules into app node_modules
# Ensure node_modules exists, copy files, and fix permissions
RUN mkdir -p ./node_modules && \
    cp -r ./node_modules_pulumi/* ./node_modules/ 2>/dev/null || true && \
    rm -rf ./node_modules_pulumi

# Copy infrastructure code for Pulumi automation API to run stacks
COPY --from=builder /app/infrastructure/tenant-provisioner ./infrastructure/tenant-provisioner
COPY --from=builder /app/infrastructure/shared-instance ./infrastructure/shared-instance

# Copy tenant Prisma schema for database migrations during provisioning
# The provisioning code expects schema at prisma/schema.prisma relative to /app
COPY --from=builder /app/apps/main/prisma ./prisma

# Fix permissions for all files
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/main/server.js"]
