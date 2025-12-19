#!/bin/bash
set -e

# =============================================================================
# Tequity VM Deployment Script
# =============================================================================
# Usage: ./deploy.sh [IMAGE_TAG]
# Example: ./deploy.sh abc123
# =============================================================================

DEPLOY_DIR="/opt/tequity"
BACKUP_DIR="/opt/tequity/backups"
LOG_FILE="/var/log/tequity/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

# Ensure log directory exists
sudo mkdir -p /var/log/tequity
sudo chown $USER:$USER /var/log/tequity

cd "$DEPLOY_DIR" || error "Could not cd to $DEPLOY_DIR"

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting deployment..."

# Set image tag from argument or use latest
export IMAGE_TAG="${1:-latest}"
log "Using IMAGE_TAG: $IMAGE_TAG"

# Check if .env exists
if [ ! -f .env ]; then
    error ".env file not found. Please create it from .env.example"
fi

# Pull new images
log "Pulling new images..."
docker compose pull || error "Failed to pull images"

# Perform rolling update
log "Starting containers..."
docker compose up -d --remove-orphans

# Wait for health checks
log "Waiting for services to become healthy..."
sleep 15

# Verify health
log "Verifying health endpoints..."
for i in {1..5}; do
    if curl -sf http://localhost:3000/api/health?probe=liveness > /dev/null; then
        log "main-app is healthy"
        break
    fi
    if [ $i -eq 5 ]; then
        error "main-app health check failed after 5 attempts"
    fi
    warn "Attempt $i: main-app not ready, waiting..."
    sleep 5
done

for i in {1..5}; do
    if curl -sf http://localhost:3001/api/health?probe=liveness > /dev/null; then
        log "admin-app is healthy"
        break
    fi
    if [ $i -eq 5 ]; then
        error "admin-app health check failed after 5 attempts"
    fi
    warn "Attempt $i: admin-app not ready, waiting..."
    sleep 5
done

# Cleanup old images
log "Cleaning up old images..."
docker image prune -f

log "Deployment completed successfully!"
echo ""
docker compose ps
