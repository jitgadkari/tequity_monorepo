import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as random from "@pulumi/random";

// Get configuration
const gcpConfig = new pulumi.Config("gcp");
const project = gcpConfig.require("project");
const region = gcpConfig.get("region") || "us-central1";

// Generate a random password for the database user
const dbPassword = new random.RandomPassword("db-password", {
  length: 24,
  special: false, // Cloud SQL has issues with some special chars
});

// ============================================
// 1. Create Cloud SQL PostgreSQL Instance
// Note: pgvector extension is available in PostgreSQL 15+ on Cloud SQL
// It needs to be enabled via SQL: CREATE EXTENSION vector;
// ============================================
const cloudSqlInstance = new gcp.sql.DatabaseInstance("test-sql", {
  name: "pulumi-test-pgvector",
  databaseVersion: "POSTGRES_15",
  region: region,
  deletionProtection: false,
  settings: {
    tier: "db-f1-micro",
    diskType: "PD_HDD",
    diskSize: 10,
    ipConfiguration: {
      ipv4Enabled: true,
      // Allow connections from anywhere for testing (restrict in production!)
      authorizedNetworks: [
        {
          name: "allow-all",
          value: "0.0.0.0/0",
        },
      ],
    },
    databaseFlags: [
      { name: "max_connections", value: "100" },
    ],
    userLabels: {
      purpose: "pulumi-test",
      pgvector: "enabled",
    },
  },
});

// ============================================
// 2. Create Database
// ============================================
const database = new gcp.sql.Database("test-database", {
  name: "testdb",
  instance: cloudSqlInstance.name,
  charset: "UTF8",
  collation: "en_US.UTF8",
});

// ============================================
// 3. Create Database User
// ============================================
const dbUser = new gcp.sql.User("test-user", {
  name: "testuser",
  instance: cloudSqlInstance.name,
  password: dbPassword.result,
});

// ============================================
// 4. Create Storage Bucket
// ============================================
const bucket = new gcp.storage.Bucket("test-bucket", {
  name: `${project}-pulumi-test-bucket`,
  location: region.toUpperCase(),
  storageClass: "STANDARD",
  uniformBucketLevelAccess: true,
  forceDestroy: true,
  labels: {
    purpose: "pulumi-test",
  },
});

// ============================================
// Exports - Including connection strings
// ============================================
export const sqlInstanceName = cloudSqlInstance.name;
export const sqlConnectionName = cloudSqlInstance.connectionName;
export const sqlPublicIp = cloudSqlInstance.publicIpAddress;
export const databaseName = database.name;
export const databaseUser = dbUser.name;
export const databasePassword = pulumi.secret(dbPassword.result);

// Connection string for direct TCP connection (using public IP)
export const connectionString = pulumi.interpolate`postgresql://${dbUser.name}:${dbPassword.result}@${cloudSqlInstance.publicIpAddress}:5432/${database.name}`;

// Connection string format for Cloud SQL Proxy
export const cloudSqlProxyConnectionString = pulumi.interpolate`postgresql://${dbUser.name}:${dbPassword.result}@localhost:5432/${database.name}?host=/cloudsql/${cloudSqlInstance.connectionName}`;

// Bucket exports
export const bucketName = bucket.name;
export const bucketUrl = pulumi.interpolate`gs://${bucket.name}`;

// Summary output
export const summary = pulumi.interpolate`
===========================================
PostgreSQL Instance Created!
===========================================
Instance: ${cloudSqlInstance.name}
Database: ${database.name}
User: ${dbUser.name}
Public IP: ${cloudSqlInstance.publicIpAddress}

Connection String (use this for migrations):
  postgresql://${dbUser.name}:<password>@${cloudSqlInstance.publicIpAddress}:5432/${database.name}

To enable pgvector, connect and run:
  CREATE EXTENSION IF NOT EXISTS vector;

Then create vector tables:
  CREATE TABLE embeddings (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)
  );
===========================================
`;
