import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as random from "@pulumi/random";

// Get configuration
const config = new pulumi.Config("tequity");
const gcpConfig = new pulumi.Config("gcp");

const environment = config.require("environment");
const databaseTier = config.get("databaseTier") || "db-f1-micro";
const enableBackups = config.getBoolean("enableBackups") ?? false;
const deletionProtection = config.getBoolean("deletionProtection") ?? false;
const skipServiceAccountKey = config.getBoolean("skipServiceAccountKey") ?? true; // Default true due to org policies

const project = gcpConfig.require("project");
const region = gcpConfig.get("region") || "us-central1";

// Get tenant ID from stack config or environment variable
const tenantId = config.get("tenantId") || process.env.TENANT_ID;

if (!tenantId) {
  throw new Error("Tenant ID is required. Set it via 'tequity:tenantId' config or TENANT_ID environment variable");
}

// Sanitize tenant ID for resource naming (must be lowercase, alphanumeric, hyphens only)
const sanitizedTenantId = tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").substring(0, 30);
const resourcePrefix = `tenant-${sanitizedTenantId}`;

// Generate a random password for the database user
const dbPassword = new random.RandomPassword("db-password", {
  length: 32,
  special: true,
  overrideSpecial: "!#$%&*()-_=+[]{}<>:?",
});

// Create Cloud SQL Instance
const cloudSqlInstance = new gcp.sql.DatabaseInstance(`${resourcePrefix}-sql`, {
  name: `${resourcePrefix}-${environment}`,
  databaseVersion: "POSTGRES_15",
  region: region,
  deletionProtection: deletionProtection,
  settings: {
    tier: databaseTier,
    availabilityType: environment === "production" ? "REGIONAL" : "ZONAL",
    diskType: "PD_SSD",
    diskSize: environment === "production" ? 20 : 10,
    diskAutoresize: true,
    diskAutoresizeLimit: environment === "production" ? 100 : 50,

    backupConfiguration: {
      enabled: enableBackups,
      startTime: "03:00",
      pointInTimeRecoveryEnabled: enableBackups,
      backupRetentionSettings: {
        retainedBackups: enableBackups ? 7 : 1,
        retentionUnit: "COUNT",
      },
      transactionLogRetentionDays: enableBackups ? 7 : 1,
    },

    ipConfiguration: {
      ipv4Enabled: true,
      requireSsl: true,
      authorizedNetworks: [], // Will be configured for VPC access in production
    },

    maintenanceWindow: {
      day: 7, // Sunday
      hour: 4, // 4 AM UTC
      updateTrack: "stable",
    },

    databaseFlags: [
      { name: "max_connections", value: environment === "production" ? "100" : "50" },
      { name: "log_checkpoints", value: "on" },
      { name: "log_connections", value: "on" },
      { name: "log_disconnections", value: "on" },
    ],

    insightsConfig: {
      queryInsightsEnabled: environment === "production",
      queryStringLength: 1024,
      recordApplicationTags: true,
      recordClientAddress: true,
    },

    userLabels: {
      tenant: sanitizedTenantId,
      environment: environment,
      "managed-by": "pulumi",
    },
  },
});

// Create the database
const database = new gcp.sql.Database(`${resourcePrefix}-db`, {
  name: "tenant_db",
  instance: cloudSqlInstance.name,
  charset: "UTF8",
  collation: "en_US.UTF8",
});

// Create the database user
const dbUser = new gcp.sql.User(`${resourcePrefix}-user`, {
  name: `tenant_${sanitizedTenantId.replace(/-/g, "_")}`,
  instance: cloudSqlInstance.name,
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
        age: 365, // Delete objects older than 1 year
        withState: "ARCHIVED",
      },
    },
    {
      action: { type: "SetStorageClass", storageClass: "NEARLINE" },
      condition: {
        age: 30, // Move to nearline after 30 days
      },
    },
  ],

  cors: [
    {
      origins: ["*"], // Configure specific origins in production
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

  forceDestroy: !deletionProtection,
});

// Create Service Account for the tenant
const serviceAccount = new gcp.serviceaccount.Account(`${resourcePrefix}-sa`, {
  accountId: `${resourcePrefix}`.substring(0, 28), // Max 28 chars
  displayName: `Tenant ${tenantId} Service Account`,
  description: `Service account for tenant ${tenantId} in ${environment} environment`,
});

// Grant Storage permissions to the service account
const storageBucketIamMember = new gcp.storage.BucketIAMMember(`${resourcePrefix}-storage-iam`, {
  bucket: storageBucket.name,
  role: "roles/storage.objectAdmin",
  member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
});

// Grant Cloud SQL Client role to the service account
const sqlClientIamMember = new gcp.projects.IAMMember(`${resourcePrefix}-sql-client-iam`, {
  project: project,
  role: "roles/cloudsql.client",
  member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
});

// Create service account key (for application use)
// Note: Some organizations have constraints/iam.disableServiceAccountKeyCreation policy
// In that case, use Workload Identity Federation instead
// Set tequity:skipServiceAccountKey to false if your org allows key creation
let serviceAccountKey: gcp.serviceaccount.Key | undefined;
if (!skipServiceAccountKey) {
  serviceAccountKey = new gcp.serviceaccount.Key(`${resourcePrefix}-sa-key`, {
    serviceAccountId: serviceAccount.name,
    publicKeyType: "TYPE_X509_PEM_FILE",
  });
} else {
  console.log("Service account key creation skipped (set tequity:skipServiceAccountKey=false to enable)");
}

// Build the database URL
const databaseUrl = pulumi.all([
  cloudSqlInstance.connectionName,
  dbUser.name,
  dbPassword.result,
  database.name,
]).apply(([connectionName, user, password, dbName]: [string, string, string, string]) => {
  // Format: postgresql://user:password@localhost/db?host=/cloudsql/connection-name
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@localhost/${dbName}?host=/cloudsql/${connectionName}`;
});

// Build the direct connection URL (for Cloud SQL Proxy or direct IP)
const directDatabaseUrl = pulumi.all([
  cloudSqlInstance.publicIpAddress,
  dbUser.name,
  dbPassword.result,
  database.name,
]).apply(([ipAddress, user, password, dbName]: [string, string, string, string]) => {
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@${ipAddress}:5432/${dbName}?sslmode=require`;
});

// Export outputs
export const tenantIdOutput = tenantId;
export const cloudSqlInstanceName = cloudSqlInstance.name;
export const cloudSqlConnectionName = cloudSqlInstance.connectionName;
export const cloudSqlPublicIp = cloudSqlInstance.publicIpAddress;
export const databaseName = database.name;
export const databaseUserName = dbUser.name;
export const databasePassword = dbPassword.result;
export const databaseUrlOutput = databaseUrl;
export const directDatabaseUrlOutput = directDatabaseUrl;
export const storageBucketName = storageBucket.name;
export const storageBucketUrl = pulumi.interpolate`gs://${storageBucket.name}`;
export const serviceAccountEmail = serviceAccount.email;
export const serviceAccountKeyJson = serviceAccountKey?.privateKey;

// Export a summary object for easy consumption
export const tenantResources = {
  tenantId: tenantId,
  environment: environment,
  database: {
    instanceName: cloudSqlInstanceName,
    connectionName: cloudSqlConnectionName,
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
  serviceAccount: {
    email: serviceAccountEmail,
    keyJson: serviceAccountKeyJson, // undefined if skipServiceAccountKey=true
  },
};
