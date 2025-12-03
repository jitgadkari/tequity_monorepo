import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as random from "@pulumi/random";

/**
 * Tenant Provisioner - Unified Mode
 *
 * This supports both SHARED and DEDICATED Cloud SQL instances:
 *
 * SHARED MODE (fast, ~30 sec): Uses existing shared Cloud SQL instance
 *   Configure: pulumi config set tequity:sharedSqlInstance <instance-name>
 *   Creates: Database + User + Storage Bucket (3 resources)
 *
 * DEDICATED MODE (slow, ~13 min): Creates new Cloud SQL instance per tenant
 *   Default if sharedSqlInstance not configured
 *   Creates: SQL Instance + Database + User + Storage + Service Account + IAM (7+ resources)
 */

// Get configuration
const config = new pulumi.Config("tequity");
const gcpConfig = new pulumi.Config("gcp");

const environment = config.require("environment");
const databaseTier = config.get("databaseTier") || "db-f1-micro";
const enableBackups = config.getBoolean("enableBackups") ?? false;
const deletionProtection = config.getBoolean("deletionProtection") ?? false;
const skipServiceAccountKey = config.getBoolean("skipServiceAccountKey") ?? true;

// PRIORITY ORDER for GCP Project:
// 1. Environment variable (set by K8s configmap/secrets) - MOST RELIABLE
// 2. Pulumi config (may have stale "placeholder" value from previous runs)
// 3. Hardcoded fallback
const project = process.env.GCP_PROJECT_ID || gcpConfig.get("project") || "tequity-ajit";
const region = process.env.GCP_REGION || gcpConfig.get("region") || "us-central1";

console.log(`[Pulumi] Using project: ${project}, region: ${region}`);
console.log(`[Pulumi] GCP_PROJECT_ID env: ${process.env.GCP_PROJECT_ID}`);
console.log(`[Pulumi] gcp:project config: ${gcpConfig.get("project")}`);

// Create an explicit GCP provider with the correct project
// This overrides any stale config stored in Pulumi Cloud
const gcpProvider = new gcp.Provider("gcp-provider", {
  project: project,
  region: region,
});

// Check if using shared instance mode
const sharedSqlInstance = config.get("sharedSqlInstance") || process.env.SHARED_SQL_INSTANCE_NAME;
const sharedSqlConnectionName = config.get("sharedSqlConnectionName") || process.env.SHARED_SQL_CONNECTION_NAME || `${project}:${region}:${sharedSqlInstance}`;
const sharedSqlIp = config.get("sharedSqlIp") || process.env.SHARED_SQL_IP;
const useSharedInstance = !!sharedSqlInstance;

console.log(`[Pulumi] Mode: ${useSharedInstance ? 'SHARED' : 'DEDICATED'} instance`);
if (useSharedInstance) {
  console.log(`[Pulumi] Shared instance: ${sharedSqlInstance}`);
}

// Get tenant ID from stack config or environment variable
const tenantId = config.get("tenantId") || process.env.TENANT_ID;

if (!tenantId) {
  throw new Error("Tenant ID is required. Set it via 'tequity:tenantId' config or TENANT_ID environment variable");
}

// Sanitize tenant ID for resource naming
const sanitizedTenantId = tenantId.toLowerCase().replace(/[^a-z0-9-]/g, "-").substring(0, 30);
const resourcePrefix = `tenant-${sanitizedTenantId}`;
const tenantDbName = `tenant_${sanitizedTenantId.replace(/-/g, "_")}`;

// Generate a random password for the database user
const dbPassword = new random.RandomPassword("db-password", {
  length: 32,
  special: true,
  overrideSpecial: "!#$%&*()-_=+[]{}<>:?",
});

// ============================================
// CONDITIONAL RESOURCE CREATION
// ============================================

let cloudSqlInstance: gcp.sql.DatabaseInstance | undefined;
let cloudSqlInstanceName: pulumi.Output<string>;
let cloudSqlConnectionName: pulumi.Output<string>;
let cloudSqlPublicIp: pulumi.Output<string>;
let serviceAccount: gcp.serviceaccount.Account | undefined;
let serviceAccountKey: gcp.serviceaccount.Key | undefined;

if (useSharedInstance) {
  // ============================================
  // SHARED MODE - Reference existing instance
  // ============================================
  console.log("[Pulumi] Using SHARED instance - only creating DB, user, and storage");

  // Reference the existing shared Cloud SQL instance (don't create a new one!)
  // Use explicit provider to ensure correct project is used
  const sharedInstance = gcp.sql.DatabaseInstance.get(
    "shared-sql-instance",
    sharedSqlInstance!,
    { provider: gcpProvider }
  );

  cloudSqlInstanceName = pulumi.output(sharedSqlInstance!);
  cloudSqlConnectionName = pulumi.output(sharedSqlConnectionName);
  cloudSqlPublicIp = sharedSqlIp ? pulumi.output(sharedSqlIp) : sharedInstance.publicIpAddress;

} else {
  // ============================================
  // DEDICATED MODE - Create new instance per tenant
  // ============================================
  console.log("[Pulumi] Using DEDICATED instance - creating full infrastructure");

  cloudSqlInstance = new gcp.sql.DatabaseInstance(`${resourcePrefix}-sql`, {
    name: `${resourcePrefix}-${environment}`,
    databaseVersion: "POSTGRES_15",
    region: region,
    deletionProtection: deletionProtection,
    project: project,
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
        requireSsl: environment === "production",
        authorizedNetworks: environment !== "production" ? [
          {
            name: "allow-all-dev",
            value: "0.0.0.0/0",
          },
        ] : [],
      },

      maintenanceWindow: {
        day: 7,
        hour: 4,
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
  }, { provider: gcpProvider });

  cloudSqlInstanceName = cloudSqlInstance.name;
  cloudSqlConnectionName = cloudSqlInstance.connectionName;
  cloudSqlPublicIp = cloudSqlInstance.publicIpAddress;

  // Create Service Account (only in dedicated mode)
  serviceAccount = new gcp.serviceaccount.Account(`${resourcePrefix}-sa`, {
    accountId: `${resourcePrefix}`.substring(0, 28),
    displayName: `Tenant ${tenantId} Service Account`,
    description: `Service account for tenant ${tenantId} in ${environment} environment`,
    project: project,
  }, { provider: gcpProvider });

  // Create service account key if allowed
  if (!skipServiceAccountKey) {
    serviceAccountKey = new gcp.serviceaccount.Key(`${resourcePrefix}-sa-key`, {
      serviceAccountId: serviceAccount.name,
      publicKeyType: "TYPE_X509_PEM_FILE",
    }, { provider: gcpProvider });
  } else {
    console.log("Service account key creation skipped (set tequity:skipServiceAccountKey=false to enable)");
  }
}

// ============================================
// COMMON RESOURCES (both modes)
// ============================================

// Create the database (on shared or dedicated instance)
const database = new gcp.sql.Database(`${resourcePrefix}-db`, {
  name: tenantDbName,
  instance: useSharedInstance ? sharedSqlInstance! : cloudSqlInstance!.name,
  charset: "UTF8",
  collation: "en_US.UTF8",
  project: project,
}, { provider: gcpProvider });

// Create the database user
const dbUser = new gcp.sql.User(`${resourcePrefix}-user`, {
  name: tenantDbName,
  instance: useSharedInstance ? sharedSqlInstance! : cloudSqlInstance!.name,
  password: dbPassword.result,
  project: project,
}, { provider: gcpProvider });

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

  forceDestroy: !deletionProtection,
  project: project,
}, { provider: gcpProvider });

// ============================================
// IAM (only in dedicated mode)
// ============================================

if (!useSharedInstance && serviceAccount) {
  // Grant Storage permissions to the service account
  new gcp.storage.BucketIAMMember(`${resourcePrefix}-storage-iam`, {
    bucket: storageBucket.name,
    role: "roles/storage.objectAdmin",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
  }, { provider: gcpProvider });

  // Grant Cloud SQL Client role to the service account
  new gcp.projects.IAMMember(`${resourcePrefix}-sql-client-iam`, {
    project: project,
    role: "roles/cloudsql.client",
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
  }, { provider: gcpProvider });
}

// ============================================
// BUILD DATABASE URLs
// ============================================

// Build the database URL (for Cloud SQL Proxy)
const databaseUrl = pulumi.all([
  cloudSqlConnectionName,
  dbUser.name,
  dbPassword.result,
  database.name,
]).apply(([connectionName, user, password, dbName]: [string, string, string, string]) => {
  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@localhost/${dbName}?host=/cloudsql/${connectionName}`;
});

// Build the direct connection URL (for local development)
const directDatabaseUrl = pulumi.all([
  cloudSqlPublicIp,
  dbUser.name,
  dbPassword.result,
  database.name,
]).apply(([ipAddress, user, password, dbName]: [string, string, string, string]) => {
  const encodedPassword = encodeURIComponent(password);
  const sslMode = environment === "production" ? "require" : "disable";
  return `postgresql://${user}:${encodedPassword}@${ipAddress}:5432/${dbName}?sslmode=${sslMode}`;
});

// ============================================
// EXPORTS
// ============================================

export const tenantIdOutput = tenantId;
export { cloudSqlInstanceName, cloudSqlConnectionName, cloudSqlPublicIp };
export const databaseName = database.name;
export const databaseUserName = dbUser.name;
export const databasePassword = dbPassword.result;
export const databaseUrlOutput = databaseUrl;
export const directDatabaseUrlOutput = directDatabaseUrl;
export const storageBucketName = storageBucket.name;
export const storageBucketUrl = pulumi.interpolate`gs://${storageBucket.name}`;
export const serviceAccountEmail = serviceAccount?.email || pulumi.output("");
export const serviceAccountKeyJson = serviceAccountKey?.privateKey;

// Export a summary object
export const tenantResources = {
  tenantId: tenantId,
  environment: environment,
  sharedInstance: useSharedInstance,
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
  serviceAccount: serviceAccount ? {
    email: serviceAccountEmail,
    keyJson: serviceAccountKeyJson,
  } : undefined,
};
