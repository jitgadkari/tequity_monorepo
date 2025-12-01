#!/bin/bash
set -e

# Shared Cloud SQL Instance Setup Script
# This creates a single Cloud SQL instance that will host all tenant databases

echo "=== Shared Cloud SQL Instance Setup ==="
echo ""

# Configuration
PROJECT="${GCP_PROJECT:-tequity-ajit}"
REGION="${GCP_REGION:-us-central1}"
ENVIRONMENT="${ENVIRONMENT:-development}"
STACK_NAME="shared-${ENVIRONMENT}"

echo "Configuration:"
echo "  Project:     $PROJECT"
echo "  Region:      $REGION"
echo "  Environment: $ENVIRONMENT"
echo "  Stack:       $STACK_NAME"
echo ""

# Check if pulumi is installed
if ! command -v pulumi &> /dev/null; then
    echo "Error: pulumi is not installed"
    echo "Install with: brew install pulumi"
    exit 1
fi

# Check if logged in to Pulumi
if ! pulumi whoami &> /dev/null; then
    echo "Error: Not logged in to Pulumi"
    echo "Run: pulumi login"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if stack exists, if not create it
if ! pulumi stack select "$STACK_NAME" 2>/dev/null; then
    echo "Creating new stack: $STACK_NAME"
    pulumi stack init "$STACK_NAME"
fi

# Set configuration
echo "Setting Pulumi configuration..."
pulumi config set gcp:project "$PROJECT"
pulumi config set gcp:region "$REGION"
pulumi config set tequity:environment "$ENVIRONMENT"
pulumi config set tequity:databaseTier "db-f1-micro"
pulumi config set tequity:enableBackups "false"
pulumi config set tequity:deletionProtection "false"

echo ""
echo "Configuration set. Ready to deploy."
echo ""
echo "To preview changes:"
echo "  pulumi preview"
echo ""
echo "To deploy the shared instance:"
echo "  pulumi up"
echo ""
echo "After deployment, run this to export credentials to .env file:"
echo "  ./export-credentials.sh"
