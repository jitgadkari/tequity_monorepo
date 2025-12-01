/**
 * SQL-based Provisioning Module
 *
 * Fast tenant provisioning using direct SQL commands instead of Pulumi.
 * This is optimized for shared Cloud SQL instance mode where we only need to:
 * 1. Create a database for the tenant
 * 2. Create a user with password
 * 3. Grant permissions
 *
 * This takes ~5-10 seconds compared to Pulumi's ~2-5 minutes.
 * Note: This does NOT create Storage Bucket or Service Account.
 * Those can be created lazily when first needed or via a separate process.
 */

import { randomBytes } from 'crypto';

export interface SqlProvisioningConfig {
  tenantId: string;
  tenantSlug: string;
  tenantName?: string;
  environment?: 'development' | 'staging' | 'production';
  // Shared instance configuration
  sharedInstanceIp: string;
  sharedAdminUser: string;
  sharedAdminPassword: string;
  sharedInstanceName: string;
  sharedConnectionName: string;
}

export interface SqlProvisioningResult {
  success: boolean;
  tenantId?: string;
  cloudSqlInstanceName?: string;
  cloudSqlConnectionName?: string;
  databaseName?: string;
  databaseUser?: string;
  databasePassword?: string;
  databaseUrl?: string;
  directDatabaseUrl?: string;
  error?: string;
}

/**
 * Generate a secure random password
 */
function generatePassword(length: number = 32): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&*()-_=+[]{}:?';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

/**
 * Sanitize tenant ID for use in database names
 */
function sanitizeTenantId(tenantId: string): string {
  return tenantId.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
}

/**
 * Provision a tenant database using direct SQL
 *
 * This is MUCH faster than Pulumi because it only:
 * 1. Creates a database
 * 2. Creates a user
 * 3. Grants permissions
 *
 * No Storage Bucket or Service Account is created here.
 */
export async function provisionWithSql(
  config: SqlProvisioningConfig
): Promise<SqlProvisioningResult> {
  const { Client } = await import('pg');

  const sanitizedId = sanitizeTenantId(config.tenantId);
  const dbName = `tenant_${sanitizedId}`;
  const dbUser = `tenant_${sanitizedId}`;
  const dbPassword = generatePassword(32);

  console.log(`[SQL] Starting fast provisioning for tenant: ${config.tenantSlug}`);
  console.log(`[SQL] Database name: ${dbName}`);
  console.log(`[SQL] Connecting to shared instance: ${config.sharedInstanceIp}`);

  // Connect to postgres database as admin
  const adminClient = new Client({
    host: config.sharedInstanceIp,
    port: 5432,
    database: 'postgres',
    user: config.sharedAdminUser,
    password: config.sharedAdminPassword,
    ssl: config.environment === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  try {
    await adminClient.connect();
    console.log(`[SQL] Connected to shared instance`);

    // Check if database already exists
    const dbCheck = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbCheck.rows.length > 0) {
      console.log(`[SQL] Database ${dbName} already exists`);
    } else {
      // Create database
      console.log(`[SQL] Creating database: ${dbName}`);
      await adminClient.query(`CREATE DATABASE "${dbName}" WITH ENCODING 'UTF8'`);
      console.log(`[SQL] Database created`);
    }

    // Check if user already exists
    const userCheck = await adminClient.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`,
      [dbUser]
    );

    if (userCheck.rows.length > 0) {
      console.log(`[SQL] User ${dbUser} already exists, updating password`);
      await adminClient.query(`ALTER USER "${dbUser}" WITH PASSWORD '${dbPassword}'`);
    } else {
      // Create user
      console.log(`[SQL] Creating user: ${dbUser}`);
      await adminClient.query(`CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'`);
      console.log(`[SQL] User created`);
    }

    // Grant privileges
    console.log(`[SQL] Granting privileges`);
    await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`);

    // Connect to the new database to grant schema privileges
    await adminClient.end();

    const newDbClient = new Client({
      host: config.sharedInstanceIp,
      port: 5432,
      database: dbName,
      user: config.sharedAdminUser,
      password: config.sharedAdminPassword,
      ssl: config.environment === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    await newDbClient.connect();

    // Grant schema privileges
    await newDbClient.query(`GRANT ALL ON SCHEMA public TO "${dbUser}"`);
    await newDbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${dbUser}"`);
    await newDbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${dbUser}"`);

    await newDbClient.end();

    console.log(`[SQL] Provisioning completed successfully`);

    // Build database URLs
    const encodedPassword = encodeURIComponent(dbPassword);
    const sslMode = config.environment === 'production' ? 'require' : 'disable';
    const directUrl = `postgresql://${dbUser}:${encodedPassword}@${config.sharedInstanceIp}:5432/${dbName}?sslmode=${sslMode}`;
    const proxyUrl = `postgresql://${dbUser}:${encodedPassword}@localhost/${dbName}?host=/cloudsql/${config.sharedConnectionName}`;

    return {
      success: true,
      tenantId: config.tenantId,
      cloudSqlInstanceName: config.sharedInstanceName,
      cloudSqlConnectionName: config.sharedConnectionName,
      databaseName: dbName,
      databaseUser: dbUser,
      databasePassword: dbPassword,
      directDatabaseUrl: directUrl,
      databaseUrl: proxyUrl,
    };
  } catch (error) {
    console.error('[SQL] Provisioning failed:', error);
    try {
      await adminClient.end();
    } catch {
      // Ignore cleanup errors
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during SQL provisioning',
    };
  }
}

/**
 * Delete a tenant database using direct SQL
 */
export async function destroyWithSql(
  config: Pick<SqlProvisioningConfig, 'tenantId' | 'sharedInstanceIp' | 'sharedAdminUser' | 'sharedAdminPassword' | 'environment'>
): Promise<{ success: boolean; error?: string }> {
  const { Client } = await import('pg');

  const sanitizedId = sanitizeTenantId(config.tenantId);
  const dbName = `tenant_${sanitizedId}`;
  const dbUser = `tenant_${sanitizedId}`;

  console.log(`[SQL] Destroying tenant database: ${dbName}`);

  const adminClient = new Client({
    host: config.sharedInstanceIp,
    port: 5432,
    database: 'postgres',
    user: config.sharedAdminUser,
    password: config.sharedAdminPassword,
    ssl: config.environment === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  try {
    await adminClient.connect();

    // Terminate all connections to the database
    await adminClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
      AND pid <> pg_backend_pid()
    `, [dbName]);

    // Drop database
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`[SQL] Database dropped: ${dbName}`);

    // Drop user
    await adminClient.query(`DROP USER IF EXISTS "${dbUser}"`);
    console.log(`[SQL] User dropped: ${dbUser}`);

    await adminClient.end();

    return { success: true };
  } catch (error) {
    console.error('[SQL] Destroy failed:', error);
    try {
      await adminClient.end();
    } catch {
      // Ignore cleanup errors
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during SQL destroy',
    };
  }
}
