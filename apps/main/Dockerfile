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

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./

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
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Install Pulumi CLI (required by Automation API)
RUN curl -fsSL https://get.pulumi.com | sh
ENV PATH="/root/.pulumi/bin:${PATH}"

# Copy public assets
COPY --from=builder /app/apps/main/public ./apps/main/public

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/main/.next/static ./apps/main/.next/static

# Copy Prisma clients from builder
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy Pulumi packages from infrastructure directory (pnpm workspace isolation)
# These are required for tenant provisioning via @pulumi/pulumi/automation
COPY --from=builder /app/infrastructure/tenant-provisioner/node_modules/@pulumi ./node_modules/@pulumi
COPY --from=builder /app/infrastructure/tenant-provisioner/node_modules/@grpc ./node_modules/@grpc
COPY --from=builder /app/infrastructure/tenant-provisioner/node_modules/google-protobuf ./node_modules/google-protobuf
COPY --from=builder /app/infrastructure/tenant-provisioner/node_modules/@opentelemetry ./node_modules/@opentelemetry
COPY --from=builder /app/infrastructure/tenant-provisioner/node_modules/@npmcli ./node_modules/@npmcli

# Copy infrastructure code for Pulumi automation API to run stacks
COPY --from=builder /app/infrastructure/tenant-provisioner ./infrastructure/tenant-provisioner
COPY --from=builder /app/infrastructure/shared-instance ./infrastructure/shared-instance

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/main/server.js"]
