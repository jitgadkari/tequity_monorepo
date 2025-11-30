# Local Development Testing Guide

This guide covers how to set up and test the Tequity application locally without Docker.

## Prerequisites

- Node.js 18+
- pnpm 8+
- Access to Neon PostgreSQL databases

## Initial Setup

### 1. Install Dependencies

```bash
# From monorepo root
pnpm install
```

### 2. Generate Prisma Clients

```bash
# Generate master database client
pnpm --filter @tequity/database db:generate

# Generate tenant database client
cd apps/main && npx prisma generate
```

### 3. Push Database Schemas

```bash
# Push master schema
cd packages/database
DATABASE_URL="postgresql://..." npx prisma db push --schema=prisma/master.prisma

# Push tenant schema
cd apps/main
DATABASE_URL="postgresql://..." npx prisma db push
```

## Environment Variables

### Main App (`apps/main/.env.local`)

```bash
# ===========================================
# DATABASE CONFIGURATION
# ===========================================

# Master Database URL (Prisma) - Neon PostgreSQL
# Contains: Tenant, OnboardingSession, Subscription, VerificationToken, PlatformAdmin
MASTER_DATABASE_URL="postgresql://neondb_owner:npg_YJgn4aTK6Uyi@ep-royal-shape-a1jzizhx-pooler.ap-southeast-1.aws.neon.tech/tequity_test_development?sslmode=require"

# Tenant Database - Neon PostgreSQL
# Contains: User, Dataroom, File, Folder, ChatSession, ChatMessage, DocumentEmbedding
DATABASE_URL="postgresql://neondb_owner:npg_YJgn4aTK6Uyi@ep-royal-shape-a1jzizhx-pooler.ap-southeast-1.aws.neon.tech/test_docker_tequity?sslmode=require"

# ===========================================
# AUTHENTICATION
# ===========================================

# JWT Secret for token signing (min 32 characters)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-min-32-chars"

# Encryption key for tenant database credentials (AES-256)
ENCRYPTION_KEY="your-encryption-key-change-this-in-production-min-32-chars"

# ===========================================
# AI / RAG CONFIGURATION
# ===========================================

# OpenAI API Key for embeddings and chat
OPENAI_API_KEY="sk-proj-VMlKt1SPrfGNy6XqRTpa-xxx"

# Embedding model for document vectorization
OPENAI_EMBEDDING_MODEL="text-embedding-ada-002"

# LLM model for chat responses
OPENAI_LLM_MODEL="gpt-4o"

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================

# Public URL of the application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ===========================================
# FEATURE FLAGS
# ===========================================

# Provisioning Provider
# Options: 'mock' | 'supabase' | 'pulumi'
# - mock: Uses shared tenant database (development)
# - supabase: Creates isolated Supabase projects (production)
# - pulumi: Infrastructure as code provisioning (production)
PROVISIONING_PROVIDER="mock"

# Email Provider
# Options: 'mock' | 'resend' | 'sendgrid'
# - mock: Logs OTP to console (development)
# - resend: Uses Resend API (production)
# - sendgrid: Uses SendGrid API (production)
EMAIL_PROVIDER="mock"

# ===========================================
# OPTIONAL: PRODUCTION PROVIDERS
# ===========================================

# Resend (if EMAIL_PROVIDER=resend)
# RESEND_API_KEY="re_xxx"

# Supabase (if PROVISIONING_PROVIDER=supabase)
# SUPABASE_ACCESS_TOKEN="sbp_xxx"
# SUPABASE_ORG_ID="your-org-id"

# Pulumi (if PROVISIONING_PROVIDER=pulumi)
# PULUMI_ACCESS_TOKEN="pul_xxx"
```

### Admin App (`apps/admin/.env.local`)

```bash
# ===========================================
# DATABASE CONFIGURATION
# ===========================================

# Master Database URL (same as main app)
DATABASE_URL="postgresql://neondb_owner:npg_YJgn4aTK6Uyi@ep-royal-shape-a1jzizhx-pooler.ap-southeast-1.aws.neon.tech/tequity_test_development?sslmode=require"

# ===========================================
# AUTHENTICATION
# ===========================================

# Admin JWT Secret
JWT_SECRET="admin-jwt-secret-change-this-in-production-min-32-chars"

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================

# Admin app URL
NEXT_PUBLIC_APP_URL="http://localhost:3001"

# Main app URL (for API calls)
MAIN_APP_URL="http://localhost:3000"
```

## Running the Applications

### Development Mode (with hot reload)

```bash
# Run main app
cd apps/main && pnpm dev

# Run admin app (separate terminal)
cd apps/admin && pnpm dev
```

### Production Build (local)

```bash
# Build all packages
pnpm build

# Run main app in production mode
cd apps/main && pnpm start

# Run admin app in production mode
cd apps/admin && pnpm start
```

## Testing Checklist

### Authentication Flow

| Step | URL | Expected Result |
|------|-----|-----------------|
| 1. Sign up | `/signup` | Enter email, receive OTP |
| 2. Verify OTP | `/signup` | OTP logged to console (mock mode) |
| 3. Sign in | `/signin` | Enter email, receive OTP |
| 4. Verify login | `/signin` | Redirected to dashboard/onboarding |

### Onboarding Flow

| Step | URL | Expected Result |
|------|-----|-----------------|
| 1. Email verified | `/onboarding/company` | Company details form |
| 2. Company saved | `/onboarding/use-case` | Use case selection |
| 3. Use case saved | `/onboarding/team` | Team invites (optional) |
| 4. Team saved | `/onboarding/plan` | Plan selection |
| 5. Plan selected | `/onboarding/provision` | Provisioning in progress |
| 6. Provisioned | `/{tenant-slug}/Dashboard` | Dashboard loaded |

### Library Features

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| View Library | Go to Library tab | Shows files grid/list |
| Upload File | Click Upload, select file | File uploads, shows progress |
| View File | Click on file | PDF viewer opens |
| Delete File | Click dropdown → Delete | File removed from UI and DB |
| Filter Files | Click category tabs | Files filtered by type |

### RAG/Chat Features

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| Open Chat | Click chat icon | Chat panel opens |
| Ask Question | Type question, send | AI responds with context |
| View Sources | Check response | Shows relevant document chunks |

## Database Debugging

### Connect to Databases

```bash
# Master Database
psql 'postgresql://neondb_owner:npg_YJgn4aTK6Uyi@ep-royal-shape-a1jzizhx-pooler.ap-southeast-1.aws.neon.tech/tequity_test_development?sslmode=require'

# Tenant Database
psql 'postgresql://neondb_owner:npg_YJgn4aTK6Uyi@ep-royal-shape-a1jzizhx-pooler.ap-southeast-1.aws.neon.tech/test_docker_tequity?sslmode=require'
```

### Useful Queries

```sql
-- Master DB: Check tenants
SELECT id, email, slug, status, "emailVerified" FROM "Tenant";

-- Master DB: Check onboarding sessions
SELECT t.email, o."currentStage", o."companyCompletedAt"
FROM "Tenant" t
JOIN "OnboardingSession" o ON t.id = o."tenantId";

-- Tenant DB: Check users
SELECT id, email, role, "tenantSlug" FROM "User";

-- Tenant DB: Check files
SELECT id, "originalName", status, "mimeType", "createdAt" FROM "File";

-- Tenant DB: Check embeddings
SELECT f."originalName", COUNT(e.id) as chunks
FROM "File" f
LEFT JOIN "DocumentEmbedding" e ON f.id = e."fileId"
GROUP BY f.id;

-- Tenant DB: Check chat sessions
SELECT cs.id, cs."createdAt", COUNT(cm.id) as messages
FROM "ChatSession" cs
LEFT JOIN "ChatMessage" cm ON cs.id = cm."sessionId"
GROUP BY cs.id;
```

### Reset Test Data

```sql
-- Tenant DB: Delete all files and embeddings
DELETE FROM "DocumentEmbedding";
DELETE FROM "File";

-- Tenant DB: Delete chat history
DELETE FROM "ChatMessage";
DELETE FROM "ChatSession";

-- Master DB: Reset a tenant's onboarding (careful!)
UPDATE "OnboardingSession"
SET "currentStage" = 'EMAIL_VERIFIED',
    "companyCompletedAt" = NULL,
    "useCaseCompletedAt" = NULL,
    "teamCompletedAt" = NULL,
    "planCompletedAt" = NULL,
    "provisioningCompletedAt" = NULL
WHERE "tenantId" = 'your-tenant-id';
```

## Troubleshooting

### "Module not found" errors

```bash
# Regenerate Prisma clients
pnpm --filter @tequity/database db:generate
cd apps/main && npx prisma generate
```

### "Table does not exist" errors

```bash
# Push schema to database
cd apps/main && npx prisma db push
```

### "column embedding does not exist"

```sql
-- Enable pgvector in tenant database
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "DocumentEmbedding" ADD COLUMN IF NOT EXISTS embedding vector(1536);
```

### OTP not received

- Check console logs (mock mode logs OTP)
- Verify `EMAIL_PROVIDER=mock` in `.env.local`

### JWT errors on API calls

- Clear localStorage: `localStorage.clear()`
- Sign in again to get fresh token

### File upload fails

- Check browser Network tab for actual error
- Verify JWT token exists in localStorage
- Check server logs for detailed error

## VS Code Configuration

### Recommended Extensions

- Prisma
- ESLint
- Prettier
- Tailwind CSS IntelliSense

### Launch Configuration (`.vscode/launch.json`)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: Main App",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev",
      "cwd": "${workspaceFolder}/apps/main"
    },
    {
      "name": "Next.js: Admin App",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev",
      "cwd": "${workspaceFolder}/apps/admin"
    }
  ]
}
```
