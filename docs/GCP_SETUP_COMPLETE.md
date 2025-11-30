# GCP Tenant Provisioning - Complete Setup Documentation

## Overview

This document describes the GCP infrastructure setup for the Tequity multi-tenant SaaS platform. The platform uses Pulumi Automation API to provision isolated GCP resources for each tenant during onboarding.

---

## GCP Project

- **Project ID**: `tequity-ajit`
- **Region**: `us-central1`

---

## Service Account for Pulumi Deployments

### Service Account Details
- **Name**: `pulumi-deployer`
- **Email**: `pulumi-deployer@tequity-ajit.iam.gserviceaccount.com`
- **Key File**: `tequity-ajit-d3fa1933f847.json` (stored in monorepo root)

### Permissions Granted

The `pulumi-deployer` service account has the following IAM roles:

| Role | Purpose |
|------|---------|
| `roles/cloudsql.admin` | Create and manage Cloud SQL instances |
| `roles/storage.admin` | Create and manage Storage buckets |
| `roles/iam.serviceAccountAdmin` | Create service accounts for tenants |
| `roles/iam.serviceAccountKeyAdmin` | Create service account keys (blocked by org policy) |
| `roles/resourcemanager.projectIamAdmin` | Grant IAM roles to tenant service accounts |
| `roles/cloudsql.client` | Connect to Cloud SQL instances |

### Commands Used to Grant Permissions

```bash
# Cloud SQL Admin
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:pulumi-deployer@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"

# Storage Admin
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:pulumi-deployer@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Service Account Admin
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:pulumi-deployer@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"

# Service Account Key Admin
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:pulumi-deployer@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountKeyAdmin"

# Project IAM Admin
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:pulumi-deployer@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/resourcemanager.projectIamAdmin"
```

---

## GCP APIs Enabled

The following APIs were enabled for the project:

| API | Purpose |
|-----|---------|
| `sqladmin.googleapis.com` | Cloud SQL Admin API |
| `storage.googleapis.com` | Cloud Storage API |
| `iam.googleapis.com` | IAM API |
| `cloudresourcemanager.googleapis.com` | Cloud Resource Manager API |
| `container.googleapis.com` | Kubernetes Engine API (for GKE cluster) |

### Commands to Enable APIs

```bash
gcloud services enable sqladmin.googleapis.com --project=tequity-ajit
gcloud services enable storage.googleapis.com --project=tequity-ajit
gcloud services enable iam.googleapis.com --project=tequity-ajit
gcloud services enable cloudresourcemanager.googleapis.com --project=tequity-ajit
gcloud services enable container.googleapis.com --project=tequity-ajit
```

---

## GCP Resources Created Per Tenant

When a new tenant completes onboarding and triggers provisioning, the following GCP resources are created:

### 1. Cloud SQL Instance (PostgreSQL 15)

- **Instance Name**: `tenant-{slug}-{environment}` (e.g., `tenant-c5e14847-2d98-4aac-9108-3b629d-development`)
- **Database Version**: PostgreSQL 15
- **Machine Type**: `db-f1-micro` (development) / `db-custom-1-3840` (production)
- **Disk**: SSD, auto-resize enabled
- **Availability**: ZONAL (development) / REGIONAL (production)
- **Backups**: Disabled in dev, enabled in production
- **SSL**: Required

### 2. Database and User

- **Database Name**: `tenant_db`
- **User Name**: `tenant_{slug}` (e.g., `tenant_c5e14847_2d98_4aac_9108_3b629d`)
- **Password**: Auto-generated 32-character password with special characters

### 3. Cloud Storage Bucket

- **Bucket Name**: `{project}-tenant-{slug}-{environment}` (e.g., `tequity-ajit-tenant-c5e14847-2d98-4aac-9108-3b629d-development`)
- **Location**: `US-CENTRAL1`
- **Storage Class**: STANDARD
- **Versioning**: Disabled in dev, enabled in production
- **Lifecycle Rules**:
  - Move to NEARLINE after 30 days
  - Delete ARCHIVED objects after 365 days

### 4. Service Account

- **Email**: `tenant-{slug}@{project}.iam.gserviceaccount.com` (e.g., `tenant-c5e14847-2d98-4aac-91@tequity-ajit.iam.gserviceaccount.com`)
- **Roles Granted**:
  - `roles/storage.objectAdmin` on the tenant's bucket
  - `roles/cloudsql.client` for database access

### 5. Service Account Key (Optional)

- **Status**: Skipped by default due to organization policy `constraints/iam.disableServiceAccountKeyCreation`
- **Alternative**: Use Workload Identity Federation in GKE

---

## Vector Database (pgvector) for RAG/Embeddings

Each tenant's PostgreSQL database includes **pgvector** extension for storing document embeddings used in RAG (Retrieval Augmented Generation) chat.

### pgvector Setup

The pgvector extension is initialized automatically when the first file is uploaded:

```sql
-- Extension is created
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding column added to DocumentEmbedding table
ALTER TABLE "DocumentEmbedding" ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS document_embedding_vector_idx
ON "DocumentEmbedding"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### DocumentEmbedding Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `fileId` | UUID | Reference to File table |
| `chunkIndex` | INT | Position in document (for ordered retrieval) |
| `content` | TEXT | Text chunk content |
| `metadata` | JSONB | Sheet name, row number, page, category, etc. |
| `embedding` | vector(1536) | OpenAI ada-002 embedding (1536 dimensions) |
| `createdAt` | TIMESTAMP | Creation timestamp |

### Vector Operations

The platform supports:
- **Upsert embeddings**: Store document chunks with their vector representations
- **Cosine similarity search**: Find similar content using `<=>` operator
- **Multi-file search**: Search across files with category prioritization
- **Targeted file search**: Search within specific files only

### Key Files

| File | Purpose |
|------|---------|
| `apps/main/lib/ai/vector-store.ts` | pgvector operations (upsert, search, delete) |
| `apps/main/lib/ai/embeddings.ts` | OpenAI embedding generation |
| `apps/main/lib/ai/rag-chain.ts` | RAG pipeline for chat |
| `apps/main/app/api/admin/init-vector-store/route.ts` | Manual vector store initialization API |

---

## Database URL Storage in Master DB

After provisioning, the tenant's database credentials are stored **encrypted** in the master database (Neon PostgreSQL).

### Tenant Table Fields (Master DB)

```prisma
model Tenant {
  // ... other fields

  // Provisioning provider
  provisioningProvider ProvisioningProvider?  // SUPABASE | GCP | MOCK

  // Supabase provisioning
  supabaseProjectId    String?
  supabaseProjectRef   String?
  databaseUrlEncrypted String?  // Encrypted connection string

  // GCP provisioning (what we're using)
  gcpProjectId               String?
  gcpRegion                  String?
  cloudSqlInstanceName       String?
  cloudSqlConnectionName     String?
  gcpDatabaseUrlEncrypted    String?  // Encrypted: postgresql://user:pass@host/db
  storageBucketName          String?
  serviceAccountEmail        String?
  serviceAccountKeyEncrypted String?  // Encrypted SA key JSON (if created)
  pulumiStackName            String?
}
```

### Encryption

Database URLs and credentials are encrypted using AES-256-GCM before storage:

```typescript
// packages/utils/src/encryption.ts
import { encrypt, decrypt } from '@tequity/utils';

// Encrypt before storing
const encryptedDbUrl = encrypt(result.databaseUrl);

// Decrypt when connecting to tenant DB
const databaseUrl = decrypt(tenant.gcpDatabaseUrlEncrypted);
```

### How Tenant DB Connection Works

1. User accesses `/{tenant_slug}/Dashboard`
2. Middleware extracts `tenant_slug` from URL
3. Master DB queried to get tenant's encrypted DB URL
4. URL decrypted and used to create Prisma client connection
5. Tenant-specific queries executed against their isolated database

---

## Provisioning Progress UX

### Onboarding Stages

The onboarding flow is tracked in the `OnboardingSession` table with these stages:

```typescript
enum OnboardingStage {
  SIGNUP_STARTED       // User started signup
  EMAIL_VERIFIED       // Email OTP verified
  DATAROOM_CREATED     // Workspace name entered
  USE_CASE_SELECTED    // Use case chosen
  WORKFLOW_SETUP       // Workflow configured
  USERS_INVITED        // Team invites sent
  PLAN_SELECTED        // Plan chosen (free/paid)
  PAYMENT_PENDING      // Waiting for payment
  PAYMENT_COMPLETED    // Payment successful
  PROVISIONING         // GCP resources being created  ← Long wait here
  ACTIVE               // Ready to use
}
```

### Stage Timestamps Tracked

```prisma
model OnboardingSession {
  signupAt           DateTime   // User started
  emailVerifiedAt    DateTime?  // OTP verified
  dataroomCreatedAt  DateTime?  // Company name entered
  useCaseSelectedAt  DateTime?
  workflowSetupAt    DateTime?
  usersInvitedAt     DateTime?
  planSelectedAt     DateTime?
  paymentCompletedAt DateTime?
  provisioningAt     DateTime?  // Pulumi started
  activatedAt        DateTime?  // Resources ready
}
```

### Current Provisioning Page

When user is in `PROVISIONING` or `PAYMENT_COMPLETED` stage, they are redirected to `/provisioning`:

```typescript
// apps/main/lib/onboarding-router.ts
case 'PAYMENT_COMPLETED':
case 'PROVISIONING':
  return '/provisioning';
```

The provisioning page (`apps/main/app/[customer_slug]/ProvisioningPage.tsx`):
- Shows a spinner with "Setting up your workspace..."
- Triggers provisioning API in background
- Polls every 2 seconds using `router.refresh()`
- When status becomes `ACTIVE`, user is redirected to their workspace

### Status Polling API

```typescript
// GET /api/platform/onboarding/status
{
  tenant: { id, email, status, slug, ... },
  onboarding: {
    currentStage: "PROVISIONING",
    timestamps: {
      provisioningAt: "2024-01-15T10:30:00Z",
      activatedAt: null  // null until complete
    }
  }
}
```

### Typical Wait Time

| Resource | Time |
|----------|------|
| Cloud SQL Instance | 3-5 minutes |
| Database + User | ~30 seconds |
| Storage Bucket | ~10 seconds |
| Service Account + IAM | ~30 seconds |
| **Total** | **~4-6 minutes** |

### Future Improvements (TODO)

1. **Progress Bar**: Show which resources are being created
2. **WebSocket Updates**: Real-time progress instead of polling
3. **Background Queue**: Use job queue (Bull/BullMQ) for provisioning
4. **Estimated Time**: Show "~5 minutes remaining"
5. **Error Recovery**: Better handling of partial failures

---

## Organization Policy Constraints

The GCP project has the following organization policy that affects provisioning:

| Constraint | Effect |
|------------|--------|
| `constraints/iam.disableServiceAccountKeyCreation` | Blocks creation of service account keys |

**Workaround**: The Pulumi code conditionally skips SA key creation via `tequity:skipServiceAccountKey` config (default: `true`). For GKE deployments, use Workload Identity Federation instead.

---

## Pulumi Configuration

### Stack Naming Convention

`tenant-{slug}-{environment}` (e.g., `tenant-test08dataroom-hfneqx-development`)

### Config Values

| Key | Description | Default |
|-----|-------------|---------|
| `gcp:project` | GCP Project ID | (required) |
| `gcp:region` | GCP Region | `us-central1` |
| `tequity:tenantId` | Tenant UUID | (required) |
| `tequity:environment` | Environment | `development` |
| `tequity:databaseTier` | Cloud SQL machine type | `db-f1-micro` |
| `tequity:enableBackups` | Enable backups | `false` |
| `tequity:deletionProtection` | Prevent accidental deletion | `false` |
| `tequity:skipServiceAccountKey` | Skip SA key creation | `true` |

### Environment Variables Required

```env
# In apps/main/.env.local
PROVISIONING_PROVIDER="pulumi"
GCP_PROJECT_ID="tequity-ajit"
GCP_REGION="us-central1"
GOOGLE_APPLICATION_CREDENTIALS="/path/to/tequity-ajit-d3fa1933f847.json"
PULUMI_ACCESS_TOKEN="pul-xxx"  # Or use PULUMI_CONFIG_PASSPHRASE for local state
```

---

## Provisioning Flow

1. **User signs up** → Creates tenant record in master DB (Neon PostgreSQL)
2. **User completes onboarding** → Company name, use case, team invites
3. **User selects plan** (Free/Paid) → Triggers provisioning
4. **Provisioning API** (`/api/platform/provision`) → Calls Pulumi Automation API
5. **Pulumi creates resources**:
   - Cloud SQL instance (~3-5 minutes)
   - Database and user
   - Storage bucket
   - Service account
   - IAM bindings
6. **Master DB updated** → Tenant marked as ACTIVE with GCP resource references
7. **Tenant data initialized** → Owner user and initial dataroom created in tenant DB
8. **User redirected** to their workspace

---

## Existing Resources Created

### Test Tenant: test08@gmail.com

- **Tenant ID**: `c5e14847-2d98-4aac-9108-3b629df30296`
- **Pulumi Stack**: `tenant-test08dataroom-hfneqx-development`
- **Cloud SQL Instance**: `tenant-c5e14847-2d98-4aac-9108-3b629d-development`
- **Cloud SQL Public IP**: `34.173.117.193`
- **Cloud SQL Connection**: `tequity-ajit:us-central1:tenant-c5e14847-2d98-4aac-9108-3b629d-development`
- **Database**: `tenant_db`
- **Database User**: `tenant_c5e14847_2d98_4aac_9108_3b629d`
- **Storage Bucket**: `tequity-ajit-tenant-c5e14847-2d98-4aac-9108-3b629d-development`
- **Service Account**: `tenant-c5e14847-2d98-4aac-91@tequity-ajit.iam.gserviceaccount.com`

---

## GKE Cluster (Future Deployment)

A GKE cluster is available for production deployment:

- **Cluster Name**: `tequity-cluster-1`
- **Region**: `us-central1`
- **Node Pool**: Standard nodes

### Connecting to Cluster

```bash
gcloud container clusters get-credentials tequity-cluster-1 \
  --region=us-central1 \
  --project=tequity-ajit
```

---

## Cleanup Commands

### Destroy a Single Tenant's Resources

```bash
cd infrastructure/tenant-provisioner
pulumi stack select tenant-{slug}-{environment}
pulumi destroy --yes
pulumi stack rm --yes
```

### List All Cloud SQL Instances

```bash
gcloud sql instances list --project=tequity-ajit
```

### List All Storage Buckets

```bash
gcloud storage buckets list --project=tequity-ajit
```

### List All Service Accounts

```bash
gcloud iam service-accounts list --project=tequity-ajit
```

---

## Known Issues & Solutions

### Issue 1: Service Account Key Creation Blocked

**Error**: `Key creation is not allowed on this service account. constraints/iam.disableServiceAccountKeyCreation`

**Solution**: `tequity:skipServiceAccountKey` defaults to `true`. Use Workload Identity Federation for GKE instead.

### Issue 2: Cloud Resource Manager API Not Enabled

**Error**: `Cloud Resource Manager API has not been used in project`

**Solution**: `gcloud services enable cloudresourcemanager.googleapis.com --project=tequity-ajit`

### Issue 3: Provisioning Timeout

**Error**: `HeadersTimeoutError` during checkout

**Solution**: Implemented async provisioning pattern - provision starts in background, user can check status via polling.

---

## Files Modified During Setup

| File | Purpose |
|------|---------|
| `infrastructure/tenant-provisioner/index.ts` | Pulumi program for GCP resources |
| `packages/utils/src/pulumi-provisioning.ts` | Pulumi Automation API wrapper |
| `apps/main/app/api/platform/provision/route.ts` | Provisioning API endpoint |
| `apps/main/.env.local` | Environment variables |
| `docs/GCP_PROVISIONING_PLAN.md` | Original plan document |
