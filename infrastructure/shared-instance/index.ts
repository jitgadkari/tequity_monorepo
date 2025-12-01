import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

/**
 * Shared Cloud SQL Instance
 *
 * This creates ONE Cloud SQL instance that will be shared by ALL tenants.
 * Each tenant gets their own DATABASE and USER on this shared instance.
 *
 * Run this ONCE per environment to set up the shared infrastructure.
 *
 * Usage:
 *   cd infrastructure/shared-instance
 *   pulumi stack init shared-development
 *   pulumi config set gcp:project tequity-ajit
 *   pulumi config set gcp:region us-central1
 *   pulumi config set tequity:environment development
 *   pulumi up
 */

const config = new pulumi.Config("tequity");
const gcpConfig = new pulumi.Config("gcp");

const environment = config.require("environment");
const project = gcpConfig.require("project");
const region = gcpConfig.get("region") || "us-central1";

// Instance sizing based on expected tenant count
// db-f1-micro: 1 vCPU, 614MB RAM - good for dev, ~10 tenants
// db-g1-small: 1 vCPU, 1.7GB RAM - good for small prod, ~50 tenants
// db-custom-2-4096: 2 vCPU, 4GB RAM - good for larger prod, ~200 tenants
const databaseTier = config.get("databaseTier") || (
  environment === "production" ? "db-g1-small" : "db-f1-micro"
);

const enableBackups = config.getBoolean("enableBackups") ?? (environment === "production");
const deletionProtection = config.getBoolean("deletionProtection") ?? (environment === "production");

const instanceName = `tequity-shared-${environment}`;

// Create the SHARED Cloud SQL Instance
const sharedSqlInstance = new gcp.sql.DatabaseInstance("shared-sql-instance", {
  name: instanceName,
  databaseVersion: "POSTGRES_15",
  region: region,
  deletionProtection: deletionProtection,

  settings: {
    tier: databaseTier,
    availabilityType: environment === "production" ? "REGIONAL" : "ZONAL",
    diskType: "PD_SSD",
    diskSize: environment === "production" ? 50 : 20,
    diskAutoresize: true,
    diskAutoresizeLimit: environment === "production" ? 200 : 100,

    backupConfiguration: {
      enabled: enableBackups,
      startTime: "03:00",
      pointInTimeRecoveryEnabled: enableBackups,
      backupRetentionSettings: {
        retainedBackups: enableBackups ? 14 : 1,
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

    // Higher connection limits for shared instance
    databaseFlags: [
      { name: "max_connections", value: environment === "production" ? "500" : "200" },
      { name: "log_checkpoints", value: "on" },
      { name: "log_connections", value: "on" },
      { name: "log_disconnections", value: "on" },
    ],

    insightsConfig: {
      queryInsightsEnabled: true,
      queryStringLength: 1024,
      recordApplicationTags: true,
      recordClientAddress: true,
    },

    userLabels: {
      type: "shared",
      environment: environment,
      "managed-by": "pulumi",
    },
  },
});

// Create a postgres superuser for admin tasks
// (Tenant users will have limited permissions)
const adminPassword = new (require("@pulumi/random").RandomPassword)("admin-password", {
  length: 32,
  special: true,
  overrideSpecial: "!#$%&*()-_=+[]{}<>:?",
});

// Export outputs needed by tenant provisioner
export const instanceName = sharedSqlInstance.name;
export const connectionName = sharedSqlInstance.connectionName;
export const publicIpAddress = sharedSqlInstance.publicIpAddress;
export const privateIpAddress = sharedSqlInstance.privateIpAddress;

// Instructions for tenant provisioner
export const tenantProvisionerConfig = pulumi.interpolate`
Add these to your tenant provisioner Pulumi config:

  pulumi config set tequity:sharedSqlInstance ${sharedSqlInstance.name}
  pulumi config set tequity:sharedSqlConnectionName ${sharedSqlInstance.connectionName}
`;

export const summary = {
  instanceName: instanceName,
  connectionName: connectionName,
  publicIp: publicIpAddress,
  environment: environment,
  tier: databaseTier,
  maxConnections: environment === "production" ? 500 : 200,
};
