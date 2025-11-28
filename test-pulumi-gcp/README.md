# Test Pulumi GCP Provisioning

This is a standalone test project to verify that Pulumi can create Cloud SQL and Storage Bucket resources in GCP with pgvector support.

## Prerequisites

1. **Pulumi CLI** installed: `brew install pulumi`
2. **GCP Service Account Key**: Your service account JSON file with Cloud SQL Admin and Storage Admin roles
3. **Pulumi Access Token**: For state management

## Setup

```bash
cd test-pulumi-gcp

# Install dependencies
npm install

# Set environment variables (replace with your own credentials)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account.json"
export PULUMI_ACCESS_TOKEN="your-pulumi-access-token"

# Initialize the stack (first time only)
pulumi stack init dev

# Configure GCP project
pulumi config set gcp:project your-gcp-project-id
pulumi config set gcp:region us-central1

# Preview what will be created
pulumi preview

# Create the resources
pulumi up

# After testing, destroy the resources to avoid charges
pulumi destroy
```

## What Gets Created

1. **Cloud SQL Instance** (PostgreSQL 15)
   - Name: `pulumi-test-pgvector`
   - Tier: `db-f1-micro` (smallest, ~$10/month)
   - Region: `us-central1`
   - pgvector support available

2. **Database**
   - Name: `testdb`
   - Charset: UTF8

3. **Database User**
   - Name: `testuser`
   - Password: Auto-generated (output as secret)

4. **Storage Bucket**
   - Name: `{project}-pulumi-test-bucket`
   - Location: `US-CENTRAL1`
   - Standard storage class

## Outputs

After deployment, the following outputs are available:

- `connectionString` - PostgreSQL connection string (secret)
- `sqlPublicIp` - Public IP of the Cloud SQL instance
- `sqlConnectionName` - Connection name for Cloud SQL Proxy
- `bucketName` - Name of the created storage bucket

To get the connection string:
```bash
pulumi stack output connectionString --show-secrets
```

## Enabling pgvector

After the instance is created, connect to the database and enable pgvector:

```bash
psql "$(pulumi stack output connectionString --show-secrets)"

# Then run:
CREATE EXTENSION IF NOT EXISTS vector;
```

## Costs

- Cloud SQL `db-f1-micro`: ~$0.015/hour (~$10/month)
- Storage Bucket: Minimal (pay per use)

**IMPORTANT**: Run `pulumi destroy` after testing to avoid ongoing charges!

## Troubleshooting

### Permission Errors
Make sure your service account has these roles:
- `Cloud SQL Admin` (roles/cloudsql.admin)
- `Storage Admin` (roles/storage.admin)

### API Not Enabled
You may need to enable these APIs in GCP Console:
- Cloud SQL Admin API
- Cloud Storage API

```bash
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
```
