# Docker Testing Guide

This guide covers how to build and test the Tequity application using Docker.

## Prerequisites

- Docker Desktop installed and running
- Access to Neon PostgreSQL databases (Master and Tenant)
- Environment variables configured

## Database Setup

The application uses two databases:

| Database | Purpose | Schema |
|----------|---------|--------|
| **Master DB** | Platform-level data (tenants, subscriptions, onboarding) | `packages/database/prisma/master.prisma` |
| **Tenant DB** | Tenant-specific data (users, files, datarooms, chat) | `apps/main/prisma/schema.prisma` |

### Create Tenant Database (if needed)

```bash
# Connect to Neon and create a new database
psql 'postgresql://neondb_owner:<password>@<host>/neondb'
CREATE DATABASE test_docker_tequity;

# Push tenant schema to the new database
DATABASE_URL="postgresql://neondb_owner:<password>@<host>/test_docker_tequity?sslmode=require" \
  npx prisma db push --schema=apps/main/prisma/schema.prisma

# Enable pgvector extension (required for RAG)
psql 'postgresql://neondb_owner:<password>@<host>/test_docker_tequity'
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "DocumentEmbedding" ADD COLUMN IF NOT EXISTS embedding vector(1536);
```

## Environment Configuration

### Create `.env.docker` file

Docker's `--env-file` flag doesn't interpret quotes, so create an unquoted version:

```bash
# apps/main/.env.docker (NO QUOTES around values)
MASTER_DATABASE_URL=postgresql://neondb_owner:<password>@<host>/tequity_test_development?sslmode=require
DATABASE_URL=postgresql://neondb_owner:<password>@<host>/test_docker_tequity?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
ENCRYPTION_KEY=your-encryption-key-change-this-in-production-min-32-chars
OPENAI_API_KEY=sk-proj-xxx
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
OPENAI_LLM_MODEL=gpt-4o
NEXT_PUBLIC_APP_URL=http://localhost:3000
PROVISIONING_PROVIDER=mock
EMAIL_PROVIDER=mock
```

Or generate from `.env.local`:

```bash
cat apps/main/.env.local | sed 's/"//g' > apps/main/.env.docker
```

## Building Docker Images

### Main Application

```bash
# From monorepo root
docker build -t tequity-main:latest -f apps/main/Dockerfile .

# With specific tag
docker build -t tequity-main:v1.0.0 -f apps/main/Dockerfile .
```

### Admin Application

```bash
docker build -t tequity-admin:latest -f apps/admin/Dockerfile .
```

## Running Containers

### Start Main App

```bash
docker run -d \
  --name tequity-main \
  -p 3000:3000 \
  --env-file apps/main/.env.docker \
  tequity-main:latest
```

### Start Admin App

```bash
docker run -d \
  --name tequity-admin \
  -p 3001:3001 \
  --env-file apps/admin/.env.docker \
  tequity-admin:latest
```

### View Logs

```bash
# Follow logs
docker logs -f tequity-main

# Last 50 lines
docker logs tequity-main --tail 50
```

### Stop and Remove

```bash
# Stop container
docker stop tequity-main

# Remove container
docker rm tequity-main

# Stop and remove in one command
docker rm -f tequity-main
```

## Quick Rebuild and Restart

```bash
# One-liner to rebuild and restart
docker rm -f tequity-main && \
  docker build -t tequity-main:latest -f apps/main/Dockerfile . && \
  docker run -d --name tequity-main -p 3000:3000 --env-file apps/main/.env.docker tequity-main:latest
```

## Testing Checklist

### 1. Authentication Flow

- [ ] Sign up with new email at `/signup`
- [ ] Receive OTP (check console logs in mock mode)
- [ ] Verify email and complete onboarding
- [ ] Sign in with existing email at `/signin`
- [ ] Verify JWT token is stored in localStorage

### 2. Onboarding Flow

- [ ] Email verification step
- [ ] Company details step
- [ ] Use case selection
- [ ] Team invites (optional)
- [ ] Plan selection (free/paid)
- [ ] Provisioning completes

### 3. Dashboard Features

- [ ] Access Library page
- [ ] Upload files (PDF, Excel, etc.)
- [ ] View uploaded files
- [ ] Delete files
- [ ] File appears in "Recently Visited"

### 4. RAG/Chat Features

- [ ] Open chat panel
- [ ] Ask questions about uploaded documents
- [ ] Verify AI responses reference document content
- [ ] Check similarity scores in responses

## Troubleshooting

### Container won't start

```bash
# Check logs for errors
docker logs tequity-main

# Verify env vars inside container
docker exec tequity-main env | grep DATABASE
```

### Database connection errors

1. Check database URLs don't have quotes
2. Verify SSL mode: `?sslmode=require`
3. Test connection manually:
   ```bash
   psql 'postgresql://user:pass@host/database?sslmode=require'
   ```

### "Invalid Compact JWS" on API calls

- JWT token not being sent
- Check localStorage has `tequity_auth_token`
- Verify `Authorization: Bearer <token>` header in requests

### File upload returns 404

- Route exists but auth failed
- Check JWT token in localStorage
- Verify token hasn't expired

### RAG returns "column embedding does not exist"

```sql
-- Enable pgvector and add embedding column
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "DocumentEmbedding" ADD COLUMN IF NOT EXISTS embedding vector(1536);
```

## Database Queries for Debugging

```bash
# Check files in tenant database
psql 'postgresql://...' -c 'SELECT id, "originalName", status FROM "File";'

# Check users
psql 'postgresql://...' -c 'SELECT id, email, role FROM "User";'

# Check tenants in master database
psql 'postgresql://...' -c 'SELECT id, slug, status FROM "Tenant";'

# Check document embeddings
psql 'postgresql://...' -c 'SELECT id, "fileId", "chunkIndex" FROM "DocumentEmbedding";'
```

## Docker Compose (Alternative)

For running both apps together, create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  main:
    build:
      context: .
      dockerfile: apps/main/Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - apps/main/.env.docker
    restart: unless-stopped

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    ports:
      - "3001:3001"
    env_file:
      - apps/admin/.env.docker
    restart: unless-stopped
```

Run with:

```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```
