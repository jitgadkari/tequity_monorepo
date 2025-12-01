import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as random from "@pulumi/random";

/**
 * Shared Instance Tenant Provisioner (FAST MODE)
 *
 * This creates ONLY the essential tenant resources using a SHARED Cloud SQL instance:
 * 1. Database on the shared instance (~5 sec)
 * 2. Database user with password (~5 sec)
 *
 * Total time: ~10-15 seconds
 *
 * Service Account and per-tenant Storage Bucket are NOT created here.
 * Instead, tenants use a shared storage bucket with tenant-prefixed paths.
 *
 * Prerequisites:
 * - A shared Cloud SQL instance must already exist
 * - Configure the shared instance details in Pulumi config
 */

// Get configuration
const config = new pulumi.Config("tequity");
const gcpConfig = new pulumi.Config("gcp");

const environment = config.require("environment");
const project = gcpConfig.require("project");
const region = gcpConfig.get("region") || "us-central1";

// Shared instance configuration
// These should be set from the shared-instance Pulumi outputs or .env.shared-instance
const sharedInstanceName = config.get("sharedSqlInstance") || process.env.SHARED_SQL_INSTANCE_NAME || `tequity-shared-${environment}`;
const sharedInstanceConnectionName = config.get("sharedSqlConnectionName") || process.env.SHARED_SQL_CONNECTION_NAME || `${project}:${region}:${sharedInstanceName}`;
const sharedInstanceIp = config.get("sharedSqlIp") || process.env.SHARED_SQL_IP;

// Get tenant ID
const tenantId = config.get("tenantId") || process.env.TENANT_ID;
if (!tenantId) {
  throw new Error("Tenant ID is required. Set it via 'tequity:tenantId' config or TENANT_ID environment variable");
}

// Sanitize tenant ID for resource naming
const sanitizedTenantId = tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").substring(0, 30);
const resourcePrefix = `tenant-${sanitizedTenantId}`;

// Database name for this tenant (each tenant gets their own database)
const tenantDbName = `tenant_${sanitizedTenantId.replace(/-/g, "_")}`;

// Generate a random password for the tenant's database user
const dbPassword = new random.RandomPassword("db-password", {
  length: 32,
  special: true,
  overrideSpecial: "!#$%&*()-_=+[]{}<>:?",
});

// Reference the existing shared Cloud SQL instance (don't create a new one!)
const sharedInstance = gcp.sql.DatabaseInstance.get(
  "shared-sql-instance",
  sharedInstanceName
);

// ============================================
// ESSENTIAL RESOURCES (Fast provisioning)
// - Database (~5 sec)
// - User (~5 sec)
// - Storage Bucket (~10-15 sec)
// Total: ~20-30 seconds
// ============================================

// Create a DATABASE for this tenant on the shared instance
// This is fast - just creates a new database, not a new instance
const database = new gcp.sql.Database(`${resourcePrefix}-db`, {
  name: tenantDbName,
  instance: sharedInstanceName,
  charset: "UTF8",
  collation: "en_US.UTF8",
});

// Create a database USER for this tenant
const dbUser = new gcp.sql.User(`${resourcePrefix}-user`, {
  name: tenantDbName, // Use same name as database for simplicity
  instance: sharedInstanceName,
  password: dbPassword.result,
});

// Create Storage Bucket for tenant files
const storageBucket = new gcp.storage.Bucket(`${resourcePrefix}-storage`, {
  name: `${project}-${resourcePrefix}-${environment}`,
  location: region.toUpperCase(),
  storageClass: "STANDARD",
  uniformBucketLevelAccess: true,

  versioning: {
    enabled: environment === "production",
  },

  lifecycleRules: [
    {
      action: { type: "Delete" },
      condition: {
        age: 365,
        withState: "ARCHIVED",
      },
    },
    {
      action: { type: "SetStorageClass", storageClass: "NEARLINE" },
      condition: {
        age: 30,
      },
    },
  ],

  cors: [
    {
      origins: ["*"],
      methods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
      responseHeaders: ["*"],
      maxAgeSeconds: 3600,
    },
  ],

  labels: {
    tenant: sanitizedTenantId,
    environment: environment,
    "managed-by": "pulumi",
  },

  forceDestroy: environment !== "production",
});

// ============================================
// Build database URLs
// ============================================

// Build the database URL using shared instance (for Cloud SQL Proxy)
const databaseUrl = pulumi.all([
  dbUser.name,
  dbPassword.result,
  database.name,
]).apply(([user, password, dbName]: [string, string, string]) => {
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@localhost/${dbName}?host=/cloudsql/${sharedInstanceConnectionName}`;
});

// Build the direct connection URL (for local development)
// Use configured IP if available, otherwise look it up from the instance
const directDatabaseUrl = pulumi.all([
  sharedInstanceIp ? pulumi.output(sharedInstanceIp) : sharedInstance.publicIpAddress,
  dbUser.name,
  dbPassword.result,
  database.name,
]).apply(([ipAddress, user, password, dbName]: [string, string, string, string]) => {
  const encodedPassword = encodeURIComponent(password);
  const sslMode = environment === "production" ? "require" : "disable";
  return `postgresql://${user}:${encodedPassword}@${ipAddress}:5432/${dbName}?sslmode=${sslMode}`;
});

// Export outputs
export const tenantIdOutput = tenantId;
export const cloudSqlInstanceName = sharedInstanceName;
export const cloudSqlConnectionName = sharedInstanceConnectionName;
export const cloudSqlPublicIp = sharedInstance.publicIpAddress;
export const databaseName = database.name;
export const databaseUserName = dbUser.name;
export const databasePassword = dbPassword.result;
export const databaseUrlOutput = databaseUrl;
export const directDatabaseUrlOutput = directDatabaseUrl;

// Storage bucket (created per tenant)
export const storageBucketName = storageBucket.name;
export const storageBucketUrl = pulumi.interpolate`gs://${storageBucket.name}`;

// Service Account is NOT created for shared instance mode
// Tenants use the shared instance's service account or workload identity
export const serviceAccountEmail = pulumi.output("");

// Export a summary object
export const tenantResources = {
  tenantId: tenantId,
  environment: environment,
  sharedInstance: true, // Flag indicating this uses shared infrastructure
  database: {
    instanceName: sharedInstanceName,
    connectionName: sharedInstanceConnectionName,
    publicIp: cloudSqlPublicIp,
    databaseName: databaseName,
    userName: databaseUserName,
    password: databasePassword,
    url: databaseUrlOutput,
    directUrl: directDatabaseUrlOutput,
  },
  storage: {
    bucketName: storageBucketName,
    bucketUrl: storageBucketUrl,
  },
};
