# CI/CD and Kubernetes Deployment Guide

This guide covers deploying the Tequity application using CI/CD pipelines and Kubernetes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                           │
│  GitHub Actions → Build → Test → Push to Registry → Deploy      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Main App    │  │  Admin App   │  │   Ingress    │          │
│  │  (3 replicas)│  │  (2 replicas)│  │  Controller  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                              │                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │              ConfigMaps & Secrets                 │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Neon DB     │  │   OpenAI     │  │   Resend     │          │
│  │  (Postgres)  │  │   (RAG)      │  │   (Email)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Kubernetes cluster (GKE, EKS, AKS, or self-hosted)
- Container registry (Docker Hub, GCR, ECR, ACR)
- kubectl configured
- GitHub repository with Actions enabled
- Domain name with DNS configured

## GitHub Actions CI/CD

### Workflow File (`.github/workflows/deploy.yml`)

```yaml
name: Build and Deploy

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

env:
  REGISTRY: ghcr.io
  IMAGE_NAME_MAIN: ${{ github.repository }}/main
  IMAGE_NAME_ADMIN: ${{ github.repository }}/admin

jobs:
  # ============================================
  # BUILD AND TEST
  # ============================================
  build-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run linting
        run: pnpm lint

      - name: Run type checking
        run: pnpm typecheck

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          MASTER_DATABASE_URL: ${{ secrets.TEST_MASTER_DATABASE_URL }}

  # ============================================
  # BUILD DOCKER IMAGES
  # ============================================
  build-images:
    needs: build-test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (main)
        id: meta-main
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_MAIN }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix=
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push main app
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/main/Dockerfile
          push: true
          tags: ${{ steps.meta-main.outputs.tags }}
          labels: ${{ steps.meta-main.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Extract metadata (admin)
        id: meta-admin
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_ADMIN }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix=
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push admin app
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/admin/Dockerfile
          push: true
          tags: ${{ steps.meta-admin.outputs.tags }}
          labels: ${{ steps.meta-admin.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ============================================
  # DEPLOY TO KUBERNETES
  # ============================================
  deploy:
    needs: build-images
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure kubectl
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - name: Update image tags
        run: |
          cd k8s/overlays/production
          kustomize edit set image \
            main-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME_MAIN }}:${{ github.sha }} \
            admin-app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME_ADMIN }}:${{ github.sha }}

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -k k8s/overlays/production

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/tequity-main -n tequity
          kubectl rollout status deployment/tequity-admin -n tequity

      - name: Verify deployment
        run: |
          kubectl get pods -n tequity
          kubectl get services -n tequity
```

## Kubernetes Manifests

### Directory Structure

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── main-deployment.yaml
│   ├── main-service.yaml
│   ├── admin-deployment.yaml
│   ├── admin-service.yaml
│   └── ingress.yaml
├── overlays/
│   ├── development/
│   │   ├── kustomization.yaml
│   │   └── patches/
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── patches/
│   └── production/
│       ├── kustomization.yaml
│       ├── secrets.yaml (encrypted)
│       └── patches/
```

### Base Manifests

#### `k8s/base/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tequity
  labels:
    app.kubernetes.io/name: tequity
```

#### `k8s/base/main-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tequity-main
  namespace: tequity
  labels:
    app: tequity-main
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tequity-main
  template:
    metadata:
      labels:
        app: tequity-main
    spec:
      containers:
        - name: main
          image: main-app:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: tequity-main-secrets
            - configMapRef:
                name: tequity-main-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

#### `k8s/base/main-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tequity-main
  namespace: tequity
spec:
  selector:
    app: tequity-main
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

#### `k8s/base/admin-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tequity-admin
  namespace: tequity
  labels:
    app: tequity-admin
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tequity-admin
  template:
    metadata:
      labels:
        app: tequity-admin
    spec:
      containers:
        - name: admin
          image: admin-app:latest
          ports:
            - containerPort: 3001
          envFrom:
            - secretRef:
                name: tequity-admin-secrets
            - configMapRef:
                name: tequity-admin-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "400m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 5
```

#### `k8s/base/admin-service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tequity-admin
  namespace: tequity
spec:
  selector:
    app: tequity-admin
  ports:
    - port: 80
      targetPort: 3001
  type: ClusterIP
```

#### `k8s/base/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tequity-ingress
  namespace: tequity
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - app.tequity.io
        - admin.tequity.io
      secretName: tequity-tls
  rules:
    - host: app.tequity.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: tequity-main
                port:
                  number: 80
    - host: admin.tequity.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: tequity-admin
                port:
                  number: 80
```

#### `k8s/base/kustomization.yaml`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: tequity

resources:
  - namespace.yaml
  - main-deployment.yaml
  - main-service.yaml
  - admin-deployment.yaml
  - admin-service.yaml
  - ingress.yaml
```

### Production Overlay

#### `k8s/overlays/production/kustomization.yaml`

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: tequity

resources:
  - ../../base

configMapGenerator:
  - name: tequity-main-config
    literals:
      - NEXT_PUBLIC_APP_URL=https://app.tequity.io
      - PROVISIONING_PROVIDER=supabase
      - EMAIL_PROVIDER=resend
      - OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
      - OPENAI_LLM_MODEL=gpt-4o

  - name: tequity-admin-config
    literals:
      - NEXT_PUBLIC_APP_URL=https://admin.tequity.io
      - MAIN_APP_URL=https://app.tequity.io

# Secrets should be managed via external secrets manager
# or sealed-secrets. Example:
secretGenerator:
  - name: tequity-main-secrets
    literals:
      - MASTER_DATABASE_URL=placeholder
      - DATABASE_URL=placeholder
      - JWT_SECRET=placeholder
      - ENCRYPTION_KEY=placeholder
      - OPENAI_API_KEY=placeholder
      - RESEND_API_KEY=placeholder

  - name: tequity-admin-secrets
    literals:
      - DATABASE_URL=placeholder
      - JWT_SECRET=placeholder

images:
  - name: main-app
    newName: ghcr.io/your-org/tequity/main
    newTag: latest
  - name: admin-app
    newName: ghcr.io/your-org/tequity/admin
    newTag: latest

replicas:
  - name: tequity-main
    count: 3
  - name: tequity-admin
    count: 2
```

## Secrets Management

### Option 1: Kubernetes Secrets (Basic)

```bash
# Create secrets from literals
kubectl create secret generic tequity-main-secrets \
  --namespace=tequity \
  --from-literal=MASTER_DATABASE_URL='postgresql://...' \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  --from-literal=ENCRYPTION_KEY='your-encryption-key' \
  --from-literal=OPENAI_API_KEY='sk-...' \
  --from-literal=RESEND_API_KEY='re_...'
```

### Option 2: External Secrets Operator (Recommended)

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: tequity-main-secrets
  namespace: tequity
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: tequity-main-secrets
  data:
    - secretKey: MASTER_DATABASE_URL
      remoteRef:
        key: tequity/production/main
        property: MASTER_DATABASE_URL
    - secretKey: DATABASE_URL
      remoteRef:
        key: tequity/production/main
        property: DATABASE_URL
    # ... other secrets
```

### Option 3: Sealed Secrets

```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Seal your secrets
kubeseal --format yaml < secrets.yaml > sealed-secrets.yaml
```

## Deployment Commands

### Manual Deployment

```bash
# Apply all manifests
kubectl apply -k k8s/overlays/production

# Check deployment status
kubectl get pods -n tequity
kubectl get services -n tequity
kubectl get ingress -n tequity

# View logs
kubectl logs -f deployment/tequity-main -n tequity

# Rollback if needed
kubectl rollout undo deployment/tequity-main -n tequity
```

### Scaling

```bash
# Scale main app
kubectl scale deployment tequity-main --replicas=5 -n tequity

# Horizontal Pod Autoscaler
kubectl autoscale deployment tequity-main \
  --min=3 --max=10 --cpu-percent=70 -n tequity
```

## Monitoring & Observability

### Health Endpoints

The apps expose health endpoints for Kubernetes probes:

- Main App: `GET /api/health`
- Admin App: `GET /api/health`

### Prometheus Metrics (Optional)

Add metrics endpoint and ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: tequity-main
  namespace: tequity
spec:
  selector:
    matchLabels:
      app: tequity-main
  endpoints:
    - port: http
      path: /api/metrics
      interval: 30s
```

## Environment-Specific Configurations

| Environment | Main App URL | Admin URL | Replicas | Provisioning |
|-------------|-------------|-----------|----------|--------------|
| Development | localhost:3000 | localhost:3001 | 1 | mock |
| Staging | staging.tequity.io | admin-staging.tequity.io | 2 | mock |
| Production | app.tequity.io | admin.tequity.io | 3+ | supabase |

## Troubleshooting

### Pod not starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n tequity

# Check logs
kubectl logs <pod-name> -n tequity --previous
```

### Database connection issues

```bash
# Test connection from pod
kubectl exec -it <pod-name> -n tequity -- sh
nc -zv <db-host> 5432
```

### Ingress not working

```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify TLS certificate
kubectl describe certificate tequity-tls -n tequity
```
