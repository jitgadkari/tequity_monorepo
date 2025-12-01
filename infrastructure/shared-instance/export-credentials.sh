#!/bin/bash
set -e

# Export Pulumi outputs to .env.shared-instance file

echo "Exporting shared instance credentials..."

# Get outputs from Pulumi
INSTANCE_NAME=$(pulumi stack output sharedInstanceName 2>/dev/null || echo "")
CONNECTION_NAME=$(pulumi stack output connectionName 2>/dev/null || echo "")
PUBLIC_IP=$(pulumi stack output publicIpAddress 2>/dev/null || echo "")
ADMIN_USER=$(pulumi stack output adminUsername 2>/dev/null || echo "postgres")
ADMIN_PASSWORD=$(pulumi stack output adminPasswordOutput --show-secrets 2>/dev/null || echo "")
MASTER_DB_URL=$(pulumi stack output masterDatabaseUrl --show-secrets 2>/dev/null || echo "")

if [ -z "$INSTANCE_NAME" ]; then
    echo "Error: Could not get instance name. Is the stack deployed?"
    echo "Run: pulumi up"
    exit 1
fi

# Write to .env file
ENV_FILE=".env.shared-instance"
cat > "$ENV_FILE" << EOF
# Shared Cloud SQL Instance Credentials
# Generated on $(date)
# DO NOT COMMIT THIS FILE

SHARED_SQL_INSTANCE_NAME='$INSTANCE_NAME'
SHARED_SQL_CONNECTION_NAME='$CONNECTION_NAME'
SHARED_SQL_IP='$PUBLIC_IP'
SHARED_SQL_ADMIN_USER='$ADMIN_USER'
SHARED_SQL_ADMIN_PASSWORD='$ADMIN_PASSWORD'
MASTER_DATABASE_URL='$MASTER_DB_URL'
EOF

echo ""
echo "Credentials exported to: $ENV_FILE"
echo ""
echo "Instance: $INSTANCE_NAME"
echo "IP:       $PUBLIC_IP"
echo "Admin:    $ADMIN_USER"
echo ""
echo "You can now use these credentials for tenant provisioning."
echo "To test the connection:"
echo "  psql \"\$MASTER_DATABASE_URL\""
