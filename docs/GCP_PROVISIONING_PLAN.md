# GCP Tenant Database Provisioning Plan

## Current Status
- ✅ GCP Project: `tequity-ajit`
- ✅ GKE Cluster: `tequity-cluster-1` in `us-central1`
- ✅ Service Account: `pulumi-deployer` with Cloud SQL/Storage/IAM permissions
- ✅ Service Account Key: Downloaded
- ✅ Pulumi Token: Ready
- ✅ Master DB: Neon PostgreSQL
- ✅ Infrastructure code: `infrastructure/tenant-provisioner/`

---

## Option A: Local Testing

### [x] Step 1: Update Environment Variables

Edit `apps/main/.env.local`:

```env
# Provisioning
PROVISIONING_PROVIDER="pulumi"
GCP_PROJECT_ID="tequity-ajit"
GCP_REGION="us-central1"
GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/pulumi-key.json"
PULUMI_ACCESS_TOKEN="pul_your_token_here"
```

### [x] Step 2: Install Dependencies

```bash
cd infrastructure/tenant-provisioner
pnpm install
```

### [ ] Step 3: Start App and Test

```bash
cd apps/main
pnpm dev
```

Go through onboarding: Sign up → Company → Use Case → Team → Free Plan → **Provisioning triggers**

### [ ] Step 4: Verify Resources Created

```bash
gcloud sql instances list --project=tequity-ajit
gcloud storage buckets list --project=tequity-ajit
pulumi stack ls
```

---

## Option B: GKE Deployment

### [ ] Step 1: Create Workload Identity Service Account

```bash
# Create workload identity SA
gcloud iam service-accounts create tequity-workload \
  --display-name="Tequity Workload Identity" \
  --project=tequity-ajit

# Grant permissions
WI_SA="tequity-workload@tequity-ajit.iam.gserviceaccount.com"

for role in cloudsql.admin storage.admin secretmanager.admin iam.serviceAccountAdmin; do
  gcloud projects add-iam-policy-binding tequity-ajit \
    --member="serviceAccount:${WI_SA}" \
    --role="roles/${role}"
done

# Allow K8s service account to use this GCP SA
gcloud iam service-accounts add-iam-policy-binding ${WI_SA} \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:tequity-ajit.svc.id.goog[tequity/tequity-workload]"
```

### [ ] Step 2: Create Artifact Registry

```bash
gcloud artifacts repositories create tequity \
  --repository-format=docker \
  --location=us-central1 \
  --project=tequity-ajit

# Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### [ ] Step 3: Build & Push Docker Images

```bash
cd /Users/ajitgadkari/Documents/Free/tequity_monorepo

# Build main app
docker build -t us-central1-docker.pkg.dev/tequity-ajit/tequity/main-app:latest \
  -f apps/main/Dockerfile .

# Build admin app
docker build -t us-central1-docker.pkg.dev/tequity-ajit/tequity/admin-app:latest \
  -f apps/admin/Dockerfile .

# Push
docker push us-central1-docker.pkg.dev/tequity-ajit/tequity/main-app:latest
docker push us-central1-docker.pkg.dev/tequity-ajit/tequity/admin-app:latest
```

### [ ] Step 4: Update K8s Manifests

**Update `k8s/base/serviceaccount.yaml`:**
```yaml
annotations:
  iam.gke.io/gcp-service-account: tequity-workload@tequity-ajit.iam.gserviceaccount.com
```

**Update `k8s/overlays/staging/kustomization.yaml`:**
```yaml
images:
  - name: main-app
    newName: us-central1-docker.pkg.dev/tequity-ajit/tequity/main-app
    newTag: latest
  - name: admin-app
    newName: us-central1-docker.pkg.dev/tequity-ajit/tequity/admin-app
    newTag: latest
```

### [ ] Step 5: Create K8s Secrets

```bash
# Get cluster credentials
gcloud container clusters get-credentials tequity-cluster-1 \
  --region=us-central1 \
  --project=tequity-ajit

# Create namespace
kubectl create namespace tequity

# Create secrets (replace with actual values)
kubectl create secret generic app-secrets \
  --namespace=tequity \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=MASTER_DATABASE_URL='postgresql://...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=ENCRYPTION_KEY='...' \
  --from-literal=GCP_PROJECT_ID='tequity-ajit' \
  --from-literal=PULUMI_ACCESS_TOKEN='...' \
  --from-literal=OPENAI_API_KEY='...'
```

### [ ] Step 6: Deploy

```bash
kubectl apply -k k8s/overlays/staging

# Check status
kubectl get pods -n tequity
kubectl logs -f deployment/main-app -n tequity
```

---

## Expected Resources Per Tenant

After provisioning:
1. **Cloud SQL**: `tenant-{slug}-development` (PostgreSQL 15)
2. **Database**: `tenant_db` with user `tenant_{slug}`
3. **Storage**: `tequity-ajit-tenant-{slug}-development`
4. **Service Account**: `tenant-{slug}@tequity-ajit.iam.gserviceaccount.com`

---

## Cleanup

```bash
cd infrastructure/tenant-provisioner
pulumi stack select tenant-{slug}-development
pulumi destroy
```
