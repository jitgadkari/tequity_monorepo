# GKE Deployment Checklist

## Project: tequity-ajit
## Region: us-central1
## Cluster: tequity-cluster-1

---

## Deployment Flow

```
+-----------------------------------------------------------------------------+
|                          GIT BRANCHING STRATEGY                              |
+-----------------------------------------------------------------------------+
|                                                                              |
|   feature/* --> develop ---------------------------> main --> tag v1.0.0    |
|                    |                              |           |              |
|                    v                              |           v              |
|              +-----------+                        |    +-----------+        |
|              |   STAGING   |                      |    | PRODUCTION  |      |
|              |  (auto)     |                      |    | (on tag)    |      |
|              +-----------+                        |    +-----------+        |
|                                                   |                          |
|   Push to develop -> Build -> Deploy to Staging   |                          |
|   Create tag v* -> Build -> Deploy to Production                             |
|                                                                              |
+-----------------------------------------------------------------------------+
```

### Triggers:
| Action | Trigger | Environment | Image Tag |
|--------|---------|-------------|-----------|
| Push to `develop` | Automatic | Staging | `staging`, `<sha>` |
| Push to `main` | Build only | - | `latest`, `<sha>` |
| Create tag `v*` | Automatic | Production | `v1.0.0`, `<sha>` |
| Manual workflow | Manual | Choice | Custom |

### How to Release:
```bash
# 1. Merge develop to main
git checkout main
git merge develop
git push origin main

# 2. Create a release tag
git tag v1.0.0
git push origin v1.0.0

# This automatically:
# - Builds Docker images with tag v1.0.0
# - Deploys to production namespace
```

---

## Phase 1: GCP Infrastructure Setup

### 1.1 Enable APIs
Run in Cloud Shell:
```bash
gcloud services enable container.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable iam.googleapis.com
```
- [x] Container API (container.googleapis.com)
- [x] Artifact Registry API (artifactregistry.googleapis.com)
- [x] Cloud SQL API (sqladmin.googleapis.com)
- [x] IAM API (iam.googleapis.com)
- [ ] Secret Manager API (secretmanager.googleapis.com) - Optional

### 1.2 Create GKE Cluster
```bash
# Create Autopilot cluster (recommended - auto-scales nodes)
gcloud container clusters create-auto tequity-cluster-1 \
  --region us-central1 \
  --project tequity-ajit

# OR Create Standard cluster (manual node management)
gcloud container clusters create tequity-cluster-1 \
  --region us-central1 \
  --num-nodes 1 \
  --machine-type e2-medium \
  --enable-ip-alias \
  --workload-pool=tequity-ajit.svc.id.goog
```
- [x] GKE Cluster: `tequity-cluster-1`

### 1.3 Create Artifact Registry
```bash
gcloud artifacts repositories create tequity \
  --repository-format=docker \
  --location=us-central1 \
  --description="Tequity Docker images"
```
- [x] Artifact Registry: `tequity` repository

### 1.4 Cloud SQL Instance (if not using existing)
```bash
# Note: Already created via Pulumi - tequity-shared-development
# IP: 34.9.81.187
```
- [x] Cloud SQL Instance: `tequity-shared-development` (IP: 34.9.81.187)

---

## Phase 2: Service Accounts & IAM

### 2.1 Create Service Accounts
```bash
# Create GitHub Actions service account (for CI/CD)
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD"

# Create Workload service account (for GKE pods)
gcloud iam service-accounts create tequity-workload \
  --display-name="Tequity Workload Identity"
```
- [x] `github-actions@tequity-ajit.iam.gserviceaccount.com` - For CI/CD
- [x] `tequity-workload@tequity-ajit.iam.gserviceaccount.com` - For GKE pods

### 2.2 Assign IAM Roles

#### github-actions Service Account:
```bash
# Push Docker images to Artifact Registry
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:github-actions@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Deploy to GKE
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:github-actions@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/container.developer"
```
- [x] `roles/artifactregistry.writer` - Push Docker images
- [x] `roles/container.developer` - Deploy to GKE

#### tequity-workload Service Account:
```bash
# Manage Cloud SQL (for tenant provisioning)
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:tequity-workload@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"

# Manage Cloud Storage buckets
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:tequity-workload@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create tenant service accounts
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:tequity-workload@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"

# Secret Manager (for tenant secrets)
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:tequity-workload@tequity-ajit.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"
```
- [x] `roles/cloudsql.admin` - Manage Cloud SQL (for provisioning)
- [x] `roles/storage.admin` - Manage Cloud Storage buckets
- [x] `roles/iam.serviceAccountAdmin` - Create tenant service accounts
- [x] `roles/secretmanager.admin` - Manage tenant secrets

### 2.3 Grant Artifact Registry Reader to GKE Nodes (CRITICAL!)
**This allows GKE nodes to pull Docker images from Artifact Registry:**
```bash
# Get the project number
PROJECT_NUMBER=$(gcloud projects describe tequity-ajit --format='value(projectNumber)')
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo "Granting Artifact Registry Reader to: $COMPUTE_SA"

# Grant to Compute Engine default service account (used by GKE nodes)
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/artifactregistry.reader"

# Grant to GKE service agent (for Autopilot)
gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:service-${PROJECT_NUMBER}@container-engine-robot.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```
- [x] `roles/artifactregistry.reader` - GKE nodes can pull images

### Note on Service Account Keys vs Workload Identity

**Local Development / Cloud Shell:**
- Uses JSON key file: `tequity-ajit-d3fa1933f847.json`
- Set via: `GOOGLE_APPLICATION_CREDENTIALS` environment variable

**GitHub Actions:**
- Uses JSON key from `github-actions` service account
- Stored in GitHub Secrets as `GCP_SA_KEY`

**GKE Pods (Production):**
- Uses **Workload Identity** (no JSON keys needed!)
- K8s ServiceAccount is annotated to use GCP ServiceAccount
- Pods automatically get credentials from GCP metadata server

---

## Phase 3: GitHub Actions Setup

### 3.1 Create Service Account Key for GitHub
Run in Cloud Shell:
```bash
# Create key for github-actions service account
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@tequity-ajit.iam.gserviceaccount.com

# Display the key (copy this for GitHub secret)
cat github-actions-key.json
```
- [x] Service account key created

### 3.2 Add GitHub Repository Secrets
Go to: GitHub Repo -> Settings -> Secrets and variables -> Actions -> New repository secret

| Secret Name | Value | Status |
|-------------|-------|--------|
| `GCP_PROJECT_ID` | `tequity-ajit` | [x] Added |
| `GCP_SA_KEY` | (paste entire JSON from github-actions-key.json) | [x] Added |

---

## Phase 4: Kubernetes Setup

### 4.1 Get Cluster Credentials
Run in Cloud Shell:
```bash
gcloud container clusters get-credentials tequity-cluster-1 --region us-central1

# Verify connection
kubectl get nodes
```
- [x] Credentials configured

---

## STAGING ENVIRONMENT SETUP

### 4.2a Create Staging Namespace
```bash
kubectl create namespace tequity-staging
```
- [x] Staging namespace created

### 4.3a Create Staging K8s Service Account
```bash
kubectl create serviceaccount tequity-workload -n tequity-staging

kubectl annotate serviceaccount tequity-workload \
  --namespace tequity-staging \
  iam.gke.io/gcp-service-account=tequity-workload@tequity-ajit.iam.gserviceaccount.com
```
- [x] Staging K8s service account created

### 4.4a Bind Workload Identity for Staging
```bash
gcloud iam service-accounts add-iam-policy-binding \
  tequity-workload@tequity-ajit.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:tequity-ajit.svc.id.goog[tequity-staging/tequity-workload]"
```
- [x] Staging Workload Identity binding created

### 4.5a Create Staging Secrets
```bash
# Generate secrets for staging
JWT_SECRET_STAGING=$(openssl rand -hex 32)
ENCRYPTION_KEY_STAGING=$(openssl rand -hex 32)
SERVICE_API_KEY_STAGING=$(openssl rand -hex 32)

echo "=== STAGING SECRETS (SAVE THESE) ==="
echo "JWT_SECRET=$JWT_SECRET_STAGING"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY_STAGING"
echo "SERVICE_API_KEY=$SERVICE_API_KEY_STAGING"

# Create staging secret
# IMPORTANT: Replace the following placeholders:
# - YOUR_SQL_PASSWORD: Your Cloud SQL postgres password
# - YOUR_OPENAI_KEY: Your OpenAI API key
# - YOUR_PULUMI_TOKEN: Your Pulumi access token

kubectl create secret generic app-secrets -n tequity-staging \
  --from-literal=MASTER_DATABASE_URL='postgresql://postgres:YOUR_SQL_PASSWORD@34.9.81.187:5432/master_db?sslmode=disable' \
  --from-literal=DATABASE_URL='postgresql://postgres:YOUR_SQL_PASSWORD@34.9.81.187:5432/master_db?sslmode=disable' \
  --from-literal=JWT_SECRET="$JWT_SECRET_STAGING" \
  --from-literal=ENCRYPTION_KEY="$ENCRYPTION_KEY_STAGING" \
  --from-literal=SERVICE_API_KEY="$SERVICE_API_KEY_STAGING" \
  --from-literal=OPENAI_API_KEY='YOUR_OPENAI_KEY' \
  --from-literal=PULUMI_ACCESS_TOKEN='YOUR_PULUMI_TOKEN' \
  --from-literal=SHARED_SQL_ADMIN_USER='postgres' \
  --from-literal=SHARED_SQL_ADMIN_PASSWORD='YOUR_SQL_PASSWORD' \
  --from-literal=GCP_PROJECT_ID='tequity-ajit'
```
- [x] Staging secrets created

### 4.6a Create Staging ConfigMap
```bash
kubectl create configmap app-config -n tequity-staging \
  --from-literal=NODE_ENV='staging' \
  --from-literal=GCP_REGION='us-central1' \
  --from-literal=GCP_PROJECT_ID='tequity-ajit' \
  --from-literal=PROVISIONING_PROVIDER='pulumi' \
  --from-literal=USE_SHARED_INSTANCE='true' \
  --from-literal=SHARED_SQL_INSTANCE_NAME='tequity-shared-development' \
  --from-literal=SHARED_SQL_CONNECTION_NAME='tequity-ajit:us-central1:tequity-shared-development' \
  --from-literal=SHARED_SQL_IP='34.9.81.187' \
  --from-literal=EMAIL_PROVIDER='mock' \
  --from-literal=NEXT_PUBLIC_APP_URL='https://staging.ajitgadkari.com' \
  --from-literal=NEXT_PUBLIC_ADMIN_URL='https://admin-staging.ajitgadkari.com' \
  --from-literal=NEXT_PUBLIC_CUSTOMER_APP_URL='https://staging.ajitgadkari.com'
```
- [x] Staging configmap created

---

## PRODUCTION ENVIRONMENT SETUP

### 4.2b Create Production Namespace
```bash
kubectl create namespace tequity
```
- [x] Production namespace created

### 4.3b Create Production K8s Service Account
```bash
kubectl create serviceaccount tequity-workload -n tequity

kubectl annotate serviceaccount tequity-workload \
  --namespace tequity \
  iam.gke.io/gcp-service-account=tequity-workload@tequity-ajit.iam.gserviceaccount.com
```
- [x] Production K8s service account created

### 4.4b Bind Workload Identity for Production
```bash
gcloud iam service-accounts add-iam-policy-binding \
  tequity-workload@tequity-ajit.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:tequity-ajit.svc.id.goog[tequity/tequity-workload]"
```
- [x] Production Workload Identity binding created

### 4.5b Create Production Secrets
```bash
# Generate secrets for production (DIFFERENT from staging!)
JWT_SECRET_PROD=$(openssl rand -hex 32)
ENCRYPTION_KEY_PROD=$(openssl rand -hex 32)
SERVICE_API_KEY_PROD=$(openssl rand -hex 32)

echo "=== PRODUCTION SECRETS (SAVE THESE) ==="
echo "JWT_SECRET=$JWT_SECRET_PROD"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY_PROD"
echo "SERVICE_API_KEY=$SERVICE_API_KEY_PROD"

# Create production secret
# IMPORTANT: Replace the following placeholders:
# - YOUR_SQL_PASSWORD: Your Cloud SQL postgres password
# - YOUR_OPENAI_KEY: Your OpenAI API key
# - YOUR_PULUMI_TOKEN: Your Pulumi access token

kubectl create secret generic app-secrets -n tequity \
  --from-literal=MASTER_DATABASE_URL='postgresql://postgres:YOUR_SQL_PASSWORD@34.9.81.187:5432/master_db?sslmode=disable' \
  --from-literal=DATABASE_URL='postgresql://postgres:YOUR_SQL_PASSWORD@34.9.81.187:5432/master_db?sslmode=disable' \
  --from-literal=JWT_SECRET="$JWT_SECRET_PROD" \
  --from-literal=ENCRYPTION_KEY="$ENCRYPTION_KEY_PROD" \
  --from-literal=SERVICE_API_KEY="$SERVICE_API_KEY_PROD" \
  --from-literal=OPENAI_API_KEY='YOUR_OPENAI_KEY' \
  --from-literal=PULUMI_ACCESS_TOKEN='YOUR_PULUMI_TOKEN' \
  --from-literal=SHARED_SQL_ADMIN_USER='postgres' \
  --from-literal=SHARED_SQL_ADMIN_PASSWORD='YOUR_SQL_PASSWORD' \
  --from-literal=GCP_PROJECT_ID='tequity-ajit'
```
- [ ] Production secrets created

### 4.6b Create Production ConfigMap
```bash
kubectl create configmap app-config -n tequity \
  --from-literal=NODE_ENV='production' \
  --from-literal=GCP_REGION='us-central1' \
  --from-literal=GCP_PROJECT_ID='tequity-ajit' \
  --from-literal=PROVISIONING_PROVIDER='pulumi' \
  --from-literal=USE_SHARED_INSTANCE='true' \
  --from-literal=SHARED_SQL_INSTANCE_NAME='tequity-shared-development' \
  --from-literal=SHARED_SQL_CONNECTION_NAME='tequity-ajit:us-central1:tequity-shared-development' \
  --from-literal=SHARED_SQL_IP='34.9.81.187' \
  --from-literal=EMAIL_PROVIDER='resend' \
  --from-literal=NEXT_PUBLIC_APP_URL='https://app.ajitgadkari.com' \
  --from-literal=NEXT_PUBLIC_ADMIN_URL='https://admin.ajitgadkari.com' \
  --from-literal=NEXT_PUBLIC_CUSTOMER_APP_URL='https://app.ajitgadkari.com'
```
- [ ] Production configmap created

---

## Phase 5: First Deployment

### 5.1 Create develop branch (locally)
```bash
git checkout -b develop
git push -u origin develop
```
This will automatically trigger:
1. Build and push Docker images to Artifact Registry
2. Deploy to staging namespace

- [x] develop branch created and pushed

### 5.2 Manual Build & Push (Alternative - if CI/CD not ready)
Run locally or in Cloud Shell:
```bash
# Authenticate Docker to Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build and push main app
docker build -t us-central1-docker.pkg.dev/tequity-ajit/tequity/main-app:staging -f apps/main/Dockerfile .
docker push us-central1-docker.pkg.dev/tequity-ajit/tequity/main-app:staging

# Build and push admin app
docker build -t us-central1-docker.pkg.dev/tequity-ajit/tequity/admin-app:staging -f apps/admin/Dockerfile .
docker push us-central1-docker.pkg.dev/tequity-ajit/tequity/admin-app:staging
```
- [x] Main app image pushed
- [x] Admin app image pushed

### 5.3 Manual Deploy (if needed)
```bash
kubectl apply -k k8s/overlays/staging
```
- [x] Staging deployment applied

### 5.4 Verify Deployment
```bash
# Check pods
kubectl get pods -n tequity-staging

# Check services
kubectl get services -n tequity-staging

# Check logs
kubectl logs -f deployment/main-app -n tequity-staging
kubectl logs -f deployment/admin-app -n tequity-staging
```
- [x] Pods running
- [x] Services created

---

## Phase 6: DNS & Ingress

### 6.1 Reserve Static IPs
```bash
# Reserve a global static IP for STAGING
gcloud compute addresses create tequity-staging-ip --global

# Get the staging IP address
gcloud compute addresses describe tequity-staging-ip --global --format='value(address)'
# Example output: 34.160.168.54

# Reserve a global static IP for PRODUCTION
gcloud compute addresses create tequity-production-ip --global

# Get the production IP address
gcloud compute addresses describe tequity-production-ip --global --format='value(address)'

# List all reserved IPs
gcloud compute addresses list --global
```
- [x] Staging static IP: `tequity-staging-ip` (34.160.168.54)
- [ ] Production static IP: `tequity-production-ip`

### 6.2 Verify Ingress Configuration
The ingress is configured in `k8s/base/ingress.yaml` and uses environment-specific patches.

```bash
# Check staging ingress (should show staging domains and IP)
kubectl get ingress -n tequity-staging

# Watch for IP assignment (may take 5-10 minutes after deployment)
kubectl get ingress -n tequity-staging -w

# Check ingress details and events
kubectl describe ingress tequity-ingress -n tequity-staging

# Check production ingress
kubectl get ingress -n tequity
```

**Expected Output (Staging):**
```
NAME              CLASS    HOSTS                                                   ADDRESS         PORTS   AGE
tequity-ingress   <none>   staging.ajitgadkari.com,admin-staging.ajitgadkari.com   34.160.168.54   80      5m
```

### 6.3 Troubleshoot Ingress Issues

#### If Ingress has no ADDRESS:
```bash
# Check ingress events for errors
kubectl describe ingress tequity-ingress -n tequity-staging | grep -A10 Events

# Common error: "static IP name doesn't translate to an existing static IP"
# Solution: Ensure the static IP name in ingress matches the reserved IP name

# Delete and recreate ingress if needed
kubectl delete ingress tequity-ingress -n tequity-staging

# Re-run CI/CD to recreate, or apply manually:
kubectl apply -k k8s/overlays/staging
```

#### If Ingress references wrong static IP name:
The ingress annotation must match the reserved IP name:
- Staging: `kubernetes.io/ingress.global-static-ip-name: "tequity-staging-ip"`
- Production: `kubernetes.io/ingress.global-static-ip-name: "tequity-production-ip"`

### 6.4 Configure DNS Records

Once the ingress has an IP address assigned, configure DNS at your domain registrar.

**Required DNS Records for ajitgadkari.com:**

| Type | Name | Value | TTL | Environment |
|------|------|-------|-----|-------------|
| A | staging | 34.160.168.54 | 300 | Staging |
| A | admin-staging | 34.160.168.54 | 300 | Staging |
| A | app | (production IP) | 300 | Production |
| A | admin | (production IP) | 300 | Production |

**Full URLs:**
- Staging: `https://staging.ajitgadkari.com`, `https://admin-staging.ajitgadkari.com`
- Production: `https://app.ajitgadkari.com`, `https://admin.ajitgadkari.com`

### 6.5 Verify DNS Propagation
```bash
# Check DNS propagation (may take 5-30 minutes)
nslookup staging.ajitgadkari.com
nslookup admin-staging.ajitgadkari.com

# Or use dig
dig staging.ajitgadkari.com +short
dig admin-staging.ajitgadkari.com +short

# Test HTTP access (once DNS propagates)
curl -I http://staging.ajitgadkari.com
curl -I http://admin-staging.ajitgadkari.com
```

### 6.6 SSL Certificate Provisioning

GKE uses **Google-managed SSL certificates** which automatically provision after DNS is configured.

```bash
# Check managed certificate status
kubectl get managedcertificates -n tequity-staging

# Detailed certificate status
kubectl describe managedcertificate tequity-cert -n tequity-staging
```

**Certificate Status Values:**
- `Provisioning` - Google is verifying domain ownership (requires DNS to be configured)
- `Active` - Certificate is ready and HTTPS is working
- `ProvisioningFailed` - DNS verification failed (check DNS records)

**Note:** SSL certificate provisioning takes 10-60 minutes after DNS is properly configured.

### 6.7 Test HTTPS Access
```bash
# Once certificate is Active:
curl -I https://staging.ajitgadkari.com
curl -I https://admin-staging.ajitgadkari.com

# Or open in browser:
# https://staging.ajitgadkari.com
# https://admin-staging.ajitgadkari.com
```

### DNS & Ingress Checklist
- [x] Staging static IP reserved (`tequity-staging-ip`: 34.160.168.54)
- [ ] Production static IP reserved (`tequity-production-ip`)
- [x] Staging ingress has IP assigned
- [ ] Production ingress has IP assigned
- [ ] DNS A record for `staging` -> 34.160.168.54
- [ ] DNS A record for `admin-staging` -> 34.160.168.54
- [ ] DNS A record for `app` -> (production IP)
- [ ] DNS A record for `admin` -> (production IP)
- [ ] Staging SSL certificate Active
- [ ] Production SSL certificate Active

---

## Quick Reference: Current Values

| Resource | Value |
|----------|-------|
| GCP Project | `tequity-ajit` |
| GCP Project Number | `926649956950` |
| Region | `us-central1` |
| GKE Cluster | `tequity-cluster-1` |
| Artifact Registry | `us-central1-docker.pkg.dev/tequity-ajit/tequity` |
| Cloud SQL Instance | `tequity-shared-development` |
| Cloud SQL IP | `34.9.81.187` |
| GitHub Actions SA | `github-actions@tequity-ajit.iam.gserviceaccount.com` |
| Workload SA | `tequity-workload@tequity-ajit.iam.gserviceaccount.com` |
| Compute SA | `926649956950-compute@developer.gserviceaccount.com` |
| Staging Namespace | `tequity-staging` |
| Production Namespace | `tequity` |
| Staging Static IP | `tequity-staging-ip` (34.160.168.54) |
| Production Static IP | `tequity-production-ip` (TBD) |

---

## Troubleshooting

### ImagePullBackOff - 403 Forbidden
If pods show `ImagePullBackOff` with `403 Forbidden` when pulling images:
```bash
# Grant Artifact Registry Reader to GKE node service accounts
PROJECT_NUMBER=$(gcloud projects describe tequity-ajit --format='value(projectNumber)')

gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

gcloud projects add-iam-policy-binding tequity-ajit \
  --member="serviceAccount:service-${PROJECT_NUMBER}@container-engine-robot.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Restart deployments to retry image pull
kubectl rollout restart deployment/main-app -n tequity-staging
kubectl rollout restart deployment/admin-app -n tequity-staging
```

### Check pod logs
```bash
# Staging
kubectl logs -f deployment/main-app -n tequity-staging
kubectl logs -f deployment/admin-app -n tequity-staging

# Production
kubectl logs -f deployment/main-app -n tequity
kubectl logs -f deployment/admin-app -n tequity
```

### Check pod status
```bash
kubectl describe pod -l app=main-app -n tequity-staging
kubectl describe pod -l app=admin-app -n tequity-staging
```

### Check events (for debugging)
```bash
kubectl get events -n tequity-staging --sort-by='.lastTimestamp'
```

### Restart deployment
```bash
kubectl rollout restart deployment/main-app -n tequity-staging
kubectl rollout restart deployment/admin-app -n tequity-staging
```

### Delete and recreate secrets
```bash
kubectl delete secret app-secrets -n tequity-staging
# Then recreate with the create command above
```

### Check GitHub Actions workflow
Go to: GitHub Repo -> Actions -> See workflow runs

### View all resources in namespace
```bash
kubectl get all -n tequity-staging
kubectl get all -n tequity
```

---

## Updating Secrets (if needed)

### Delete existing secret
```bash
kubectl delete secret app-secrets -n tequity-staging
```

### Recreate with updated values
```bash
kubectl create secret generic app-secrets -n tequity-staging \
  --from-literal=MASTER_DATABASE_URL='...' \
  # ... rest of the secret values
```

---

## Complete Setup Checklist

### Phase 1: GCP Infrastructure
- [x] Enable APIs
- [x] Create GKE Cluster
- [x] Create Artifact Registry
- [x] Cloud SQL Instance exists

### Phase 2: Service Accounts & IAM
- [x] Create github-actions service account
- [x] Create tequity-workload service account
- [x] Assign IAM roles to github-actions
- [x] Assign IAM roles to tequity-workload
- [x] Grant artifactregistry.reader to GKE node service accounts

### Phase 3: GitHub Actions
- [x] Create service account key
- [x] Add GCP_PROJECT_ID secret to GitHub
- [x] Add GCP_SA_KEY secret to GitHub

### Phase 4: Kubernetes Setup
- [x] Get cluster credentials
- [x] Create tequity-staging namespace
- [x] Create tequity namespace
- [x] Create K8s service accounts
- [x] Bind Workload Identity (both namespaces)
- [x] Create staging secrets
- [x] Create staging configmap
- [ ] Create production secrets
- [ ] Create production configmap

### Phase 5: First Deployment
- [x] Create and push develop branch
- [x] Verify staging deployment (pods running)

### Phase 6: DNS & Ingress
- [x] Reserve staging static IP (`tequity-staging-ip`: 34.160.168.54)
- [ ] Reserve production static IP (`tequity-production-ip`)
- [x] Staging ingress has IP assigned
- [ ] Production ingress has IP assigned
- [ ] Configure DNS A records at domain registrar
- [ ] SSL certificates provisioned (auto after DNS)

---

## CI/CD Workflow Summary

The `build-push.yaml` workflow handles everything in one workflow:

1. **Push to `develop`**: Build images -> Deploy to staging
2. **Push to `main`**: Build images only (no deploy)
3. **Create `v*` tag**: Build images -> Deploy to production

### Workflow Jobs:
```
build-and-push (always runs)
    |
    +---> deploy-staging (if environment == staging)
    |
    +---> deploy-production (if environment == production)
```

### Manual Deployment (if needed):
```bash
# Re-run failed deployment
kubectl apply -k k8s/overlays/staging

# Or trigger workflow manually from GitHub Actions UI
```
