import { NextResponse } from 'next/server';
import { getMasterDb } from '@/lib/master-db';
import {
  createSupabaseProject,
  waitForProjectReady,
  getTenantCredentials,
  encrypt,
} from '@tequity/utils';
import {
  getEffectiveProvisioningProvider,
  type ProvisioningProvider,
} from '@/lib/feature-flags';

// Dynamic import for Pulumi to avoid bundling native dependencies
async function getProvisionWithPulumi() {
  const { provisionWithPulumi } = await import('@tequity/utils/pulumi');
  return provisionWithPulumi;
}

type DbClient = ReturnType<typeof getMasterDb>;

interface TenantData {
  id: string;
  slug: string | null;
  workspaceName: string | null;
  email: string;
  fullName: string | null;
  settings: unknown;
}

/**
 * Mock provisioning - for development/testing
 */
async function provisionMock(
  db: DbClient,
  tenantId: string,
  tenantSlug: string
) {
  const startTime = Date.now();
  console.log(`[Mock] ========== STARTING MOCK PROVISIONING ==========`);
  console.log(`[Mock] Tenant ID: ${tenantId}`);
  console.log(`[Mock] Tenant Slug: ${tenantSlug}`);
  console.log(`[Mock] Timestamp: ${new Date().toISOString()}`);

  console.log(`[Mock] Updating tenant status in database...`);
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE',
      provisioningProvider: 'MOCK',
      supabaseProjectId: `mock_${tenantSlug}`,
      supabaseProjectRef: `mock_ref_${tenantSlug}`,
      databaseUrlEncrypted: 'mock_encrypted_url',
    },
  });

  const duration = Date.now() - startTime;
  console.log(`[Mock] ========== MOCK PROVISIONING COMPLETE ==========`);
  console.log(`[Mock] Duration: ${duration}ms`);
  console.log(`[Mock] Tenant ${tenantSlug} is now ACTIVE`);

  return {
    success: true,
    message: 'Tenant provisioned (mock mode)',
    tenantSlug,
  };
}

/**
 * Supabase provisioning - uses Supabase Management API
 */
async function provisionSupabase(
  db: DbClient,
  tenantId: string,
  tenant: TenantData
) {
  const startTime = Date.now();
  const tenantSlug = tenant.slug || tenantId;
  const tenantName = tenant.workspaceName || 'Workspace';

  console.log(`[Supabase] ========== STARTING SUPABASE PROVISIONING ==========`);
  console.log(`[Supabase] Tenant ID: ${tenantId}`);
  console.log(`[Supabase] Tenant Slug: ${tenantSlug}`);
  console.log(`[Supabase] Tenant Name: ${tenantName}`);
  console.log(`[Supabase] Timestamp: ${new Date().toISOString()}`);

  // Update status to provisioning
  console.log(`[Supabase] Setting tenant status to PROVISIONING...`);
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'PROVISIONING',
      provisioningProvider: 'SUPABASE',
    },
  });

  // Create Supabase project
  const projectName = `tequity-${tenantSlug}`.slice(0, 40);
  console.log(`[Supabase] Creating Supabase project: ${projectName}...`);
  const createProjectStart = Date.now();
  const { project, dbPassword } = await createSupabaseProject(projectName);
  console.log(`[Supabase] Project creation took ${Date.now() - createProjectStart}ms`);

  if (!project.ref) {
    throw new Error('Failed to create Supabase project: no project ref returned');
  }

  console.log(`[Supabase] Project created: ${project.ref}, waiting for it to be ready...`);

  // Wait for project to be ready
  const waitStart = Date.now();
  await waitForProjectReady(project.ref);
  console.log(`[Supabase] Wait for project ready took ${Date.now() - waitStart}ms`);

  console.log(`[Supabase] Project ${project.ref} is ready, fetching credentials...`);

  // Get database credentials
  const credentials = await getTenantCredentials(project.ref, dbPassword);
  console.log(`[Supabase] Credentials received:`);
  console.log(`[Supabase]   - Transaction pooler (port 6543): for runtime`);
  console.log(`[Supabase]   - Session pooler (port 5432): for migrations (direct often blocked)`);
  console.log(`[Supabase]   - Direct connection: backup (may be blocked by firewall)`);

  // Encrypt the database URL and credentials
  const encryptedUrl = encrypt(credentials.databaseUrl);
  const encryptedCredentials = encrypt(JSON.stringify({
    supabaseUrl: credentials.supabaseUrl,
    anonKey: credentials.anonKey,
    serviceRoleKey: credentials.serviceRoleKey,
    databasePassword: credentials.databasePassword,
  }));

  // Update tenant with Supabase project details
  // NOTE: Keep status as PROVISIONING until migrations complete
  // The status will be set to ACTIVE after initializeTenantData() in the main POST handler
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'PROVISIONING', // Keep as PROVISIONING - will be set to ACTIVE after migrations
      provisioningProvider: 'SUPABASE',
      supabaseProjectId: credentials.projectId,
      supabaseProjectRef: project.ref,
      databaseUrlEncrypted: encryptedUrl,
      settings: {
        ...(tenant.settings as object || {}),
        credentialsEncrypted: encryptedCredentials,
      },
    },
  });

  const duration = Date.now() - startTime;
  console.log(`[Supabase] ========== SUPABASE PROVISIONING COMPLETE ==========`);
  console.log(`[Supabase] Total duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
  console.log(`[Supabase] Tenant ${tenantSlug} provisioned successfully`);
  console.log(`[Supabase] Project Ref: ${project.ref}`);

  return {
    success: true,
    message: 'Tenant provisioned successfully (Supabase)',
    tenantSlug,
    // Use session pooler URL for migrations - direct connection often blocked by firewall
    // Session pooler (port 5432) is recommended for migrations as it maintains session state
    databaseUrl: credentials.databaseUrlSession,
  };
}

/**
 * Pulumi/GCP provisioning - uses Pulumi Automation API (slower, creates dedicated resources)
 */
async function provisionPulumi(
  db: DbClient,
  tenantId: string,
  tenant: TenantData
) {
  const startTime = Date.now();
  const tenantSlug = tenant.slug || tenantId;
  const tenantName = tenant.workspaceName || 'Workspace';

  console.log(`[Pulumi/GCP] ========== STARTING PULUMI/GCP PROVISIONING ==========`);
  console.log(`[Pulumi/GCP] Tenant ID: ${tenantId}`);
  console.log(`[Pulumi/GCP] Tenant Slug: ${tenantSlug}`);
  console.log(`[Pulumi/GCP] Tenant Name: ${tenantName}`);
  console.log(`[Pulumi/GCP] Timestamp: ${new Date().toISOString()}`);

  // Determine environment from NODE_ENV or DEPLOY_ENV
  const deployEnv = process.env.DEPLOY_ENV || process.env.NODE_ENV;
  const environment: 'development' | 'staging' | 'production' =
    deployEnv === 'production' ? 'production' :
    deployEnv === 'staging' ? 'staging' : 'development';

  console.log(`[Pulumi/GCP] Environment: ${environment} (DEPLOY_ENV=${deployEnv})`);

  // Update status to provisioning
  console.log(`[Pulumi/GCP] Setting tenant status to PROVISIONING...`);
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'PROVISIONING',
      provisioningProvider: 'GCP',
    },
  });

  // Check if we should use shared instance mode (fast provisioning)
  const useSharedInstance = process.env.USE_SHARED_INSTANCE === 'true';
  console.log(`[Pulumi/GCP] Instance Mode: ${useSharedInstance ? 'SHARED' : 'DEDICATED'}`);
  console.log(`[Pulumi/GCP] GCP Project: ${process.env.GCP_PROJECT_ID || 'not set'}`);
  console.log(`[Pulumi/GCP] GCP Region: ${process.env.GCP_REGION || 'us-central1 (default)'}`);

  console.log(`[Pulumi/GCP] Loading Pulumi module...`);
  const provisionWithPulumi = await getProvisionWithPulumi();

  console.log(`[Pulumi/GCP] Executing Pulumi provisioning...`);
  const pulumiStart = Date.now();
  const result = await provisionWithPulumi({
    tenantId,
    tenantSlug,
    tenantName,
    environment: environment as 'development' | 'staging' | 'production',
    region: process.env.GCP_REGION || 'us-central1',
    // Shared instance configuration
    useSharedInstance,
    sharedInstanceName: process.env.SHARED_SQL_INSTANCE_NAME,
    sharedInstanceConnectionName: process.env.SHARED_SQL_CONNECTION_NAME,
    sharedInstanceIp: process.env.SHARED_SQL_IP,
  });
  console.log(`[Pulumi/GCP] Pulumi execution took ${Date.now() - pulumiStart}ms`);

  if (!result.success) {
    console.error(`[Pulumi/GCP] Provisioning failed: ${result.error}`);
    throw new Error(result.error || 'Pulumi provisioning failed');
  }
  console.log(`[Pulumi/GCP] Pulumi provisioning succeeded`);
  console.log(`[Pulumi/GCP] Stack: ${result.pulumiStackName || 'N/A'}`);

  // Debug logging to understand what URLs Pulumi returned
  console.log(`[Pulumi] Result - databaseUrl available: ${!!result.databaseUrl}`);
  console.log(`[Pulumi] Result - directDatabaseUrl available: ${!!result.directDatabaseUrl}`);
  if (result.directDatabaseUrl) {
    // Log URL format (redacted) to verify it's valid
    const urlParts = result.directDatabaseUrl.split('@');
    const hostPart = urlParts[1]?.split('/')[0] || 'unknown';
    console.log(`[Pulumi] directDatabaseUrl host: ${hostPart}`);
  }

  // Validate directDatabaseUrl is a valid TCP URL (not containing 'undefined' or socket path)
  const isValidDirectUrl = result.directDatabaseUrl &&
    !result.directDatabaseUrl.includes('undefined') &&
    !result.directDatabaseUrl.includes('/cloudsql/');

  // For storage: Use direct TCP URL if valid, otherwise fall back to socket URL
  // Note: Socket URL only works with Cloud SQL Proxy sidecar (not currently deployed)
  const dbUrlForStorage = isValidDirectUrl
    ? result.directDatabaseUrl
    : result.databaseUrl;
  const dbUrlForMigrations = isValidDirectUrl
    ? result.directDatabaseUrl
    : result.databaseUrl;

  console.log(`[Provision] Storing ${isValidDirectUrl ? 'direct TCP' : 'socket (WILL NOT WORK without proxy)'} URL for tenant`);
  const encryptedDbUrl = dbUrlForStorage ? encrypt(dbUrlForStorage) : null;
  const encryptedServiceAccountKey = result.serviceAccountKeyJson
    ? encrypt(result.serviceAccountKeyJson)
    : null;

  // Update tenant with GCP provisioning details
  // NOTE: Keep status as PROVISIONING until migrations complete
  // The status will be set to ACTIVE after initializeTenantData() in the main POST handler
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'PROVISIONING', // Keep as PROVISIONING - will be set to ACTIVE after migrations
      provisioningProvider: 'GCP',

      // GCP Cloud SQL details
      gcpProjectId: process.env.GCP_PROJECT_ID,
      gcpRegion: process.env.GCP_REGION || 'us-central1',
      cloudSqlInstanceName: result.cloudSqlInstanceName,
      cloudSqlConnectionName: result.cloudSqlConnectionName,
      gcpDatabaseUrlEncrypted: encryptedDbUrl,

      // GCP Storage details
      storageBucketName: result.storageBucketName,

      // GCP Service Account details
      serviceAccountEmail: result.serviceAccountEmail,
      serviceAccountKeyEncrypted: encryptedServiceAccountKey,

      // Pulumi stack tracking
      pulumiStackName: result.pulumiStackName,

      // Legacy field for backwards compatibility
      databaseUrlEncrypted: encryptedDbUrl,

      settings: {
        ...(tenant.settings as object || {}),
        gcpProvisioned: true,
        provisionedAt: new Date().toISOString(),
      },
    },
  });

  const duration = Date.now() - startTime;
  console.log(`[Pulumi/GCP] ========== PULUMI/GCP PROVISIONING COMPLETE ==========`);
  console.log(`[Pulumi/GCP] Total duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
  console.log(`[Pulumi/GCP] Tenant ${tenantSlug} provisioned successfully`);
  console.log(`[Pulumi/GCP] Cloud SQL Instance: ${result.cloudSqlInstanceName}`);
  console.log(`[Pulumi/GCP] Storage Bucket: ${result.storageBucketName}`);
  console.log(`[Pulumi/GCP] Service Account: ${result.serviceAccountEmail}`);

  return {
    success: true,
    message: 'Tenant provisioned successfully (GCP via Pulumi)',
    tenantSlug,
    databaseUrl: dbUrlForMigrations, // Use TCP URL for migrations (Prisma CLI can't use socket)
    resources: {
      cloudSqlInstance: result.cloudSqlInstanceName,
      storageBucket: result.storageBucketName,
      serviceAccount: result.serviceAccountEmail,
    },
  };
}

/**
 * Enable pgvector extension and create embedding column
 * This is required for vector similarity search on document embeddings
 */
async function enablePgVector(databaseUrl: string, tenantSlug: string) {
  const startTime = Date.now();
  console.log(`[pgVector] ========== ENABLING PGVECTOR ==========`);
  console.log(`[pgVector] Tenant: ${tenantSlug}`);
  console.log(`[pgVector] Timestamp: ${new Date().toISOString()}`);

  console.log(`[pgVector] Connecting to database...`);
  const { PrismaClient } = await import('@prisma/tenant-client');
  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  try {
    // Enable pgvector extension
    console.log(`[pgVector] Creating vector extension...`);
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log(`[pgVector] Vector extension enabled`);

    // Add embedding column to DocumentEmbedding table if it doesn't exist
    // Using 1536 dimensions for OpenAI ada-002 embeddings
    console.log(`[pgVector] Adding embedding column to DocumentEmbedding table...`);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "DocumentEmbedding"
      ADD COLUMN IF NOT EXISTS embedding vector(1536)
    `);
    console.log(`[pgVector] Embedding column added (1536 dimensions)`);

    // Create index for cosine similarity search
    console.log(`[pgVector] Creating vector index (ivfflat)...`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS document_embedding_vector_idx
      ON "DocumentEmbedding"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log(`[pgVector] Vector index created`);

    await prisma.$disconnect();
    const duration = Date.now() - startTime;
    console.log(`[pgVector] ========== PGVECTOR SETUP COMPLETE ==========`);
    console.log(`[pgVector] Duration: ${duration}ms`);
    return true;
  } catch (error) {
    await prisma.$disconnect();
    const duration = Date.now() - startTime;
    console.error(`[pgVector] ========== PGVECTOR SETUP FAILED ==========`);
    console.error(`[pgVector] Duration: ${duration}ms`);
    console.error(`[pgVector] Error for tenant ${tenantSlug}:`, error);
    // Don't throw - pgvector is optional, file uploads can still work without embeddings
    console.warn(`[pgVector] Continuing without pgvector - embeddings will be disabled`);
    return false;
  }
}

/**
 * Run Prisma migrations on a new tenant database
 * This creates all the required tables in the newly provisioned database
 */
async function runTenantMigrations(databaseUrl: string, tenantSlug: string) {
  const startTime = Date.now();
  console.log(`[Migration] ========== STARTING DATABASE MIGRATIONS ==========`);
  console.log(`[Migration] Tenant: ${tenantSlug}`);
  console.log(`[Migration] Timestamp: ${new Date().toISOString()}`);

  // Log database URL details (redacted for security)
  try {
    const url = new URL(databaseUrl);
    console.log(`[Migration] Database URL Details:`);
    console.log(`[Migration]   Protocol: ${url.protocol}`);
    console.log(`[Migration]   Host: ${url.hostname}`);
    console.log(`[Migration]   Port: ${url.port || '5432 (default)'}`);
    console.log(`[Migration]   Database: ${url.pathname.replace('/', '')}`);
    console.log(`[Migration]   Username: ${url.username}`);
    console.log(`[Migration]   Password: ${url.password ? '[REDACTED - ' + url.password.length + ' chars]' : '[EMPTY]'}`);
    console.log(`[Migration]   Search Params: ${url.search || 'none'}`);
    console.log(`[Migration]   Full URL Length: ${databaseUrl.length} chars`);
  } catch (parseError) {
    console.error(`[Migration] ERROR: Failed to parse database URL as valid URL`);
    console.error(`[Migration] URL starts with: ${databaseUrl.substring(0, 30)}...`);
    console.error(`[Migration] URL length: ${databaseUrl.length}`);
    console.error(`[Migration] Parse error:`, parseError);
  }

  const { execSync } = await import('child_process');
  const path = await import('path');

  // Get the path to the tenant prisma schema
  const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
  console.log(`[Migration] Schema path: ${schemaPath}`);
  console.log(`[Migration] Using Prisma 6.x (pinned for compatibility)`);

  try {
    // Run prisma db push to create tables (works better than migrate for new DBs)
    // We use db push since we don't need migration history for fresh tenant DBs
    // Pin to Prisma 6.x - v7 has breaking changes (removes datasource url from schema)
    console.log(`[Migration] Executing: npx prisma@6 db push --schema="${schemaPath}" --accept-data-loss --skip-generate`);
    console.log(`[Migration] Timeout: 120000ms (2 minutes)`);

    // Retry logic for Supabase pooler - the pooler takes time to recognize new database users
    // Supabase can take 30-60 seconds to propagate new users to the pooler
    const maxRetries = 5;
    const retryDelay = 15000; // 15 seconds between retries (total wait: up to 60 seconds)
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Migration] Attempt ${attempt}/${maxRetries} - Running prisma db push...`);
      const dbPushStart = Date.now();

      try {
        execSync(`npx prisma@6 db push --schema="${schemaPath}" --accept-data-loss --skip-generate`, {
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl,
          },
          stdio: 'pipe',
          timeout: 120000, // 2 minute timeout
        });
        console.log(`[Migration] Prisma db push took ${Date.now() - dbPushStart}ms`);
        console.log(`[Migration] Schema tables created successfully`);
        break; // Success - exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const execError = error as { stderr?: Buffer; stdout?: Buffer };
        const stderr = execError.stderr?.toString() || '';
        const stdout = execError.stdout?.toString() || '';

        console.error(`[Migration] Attempt ${attempt} failed after ${Date.now() - dbPushStart}ms`);
        console.error(`[Migration] STDOUT: ${stdout}`);
        console.error(`[Migration] STDERR: ${stderr}`);

        // Check if it's a "Tenant or user not found" error (Supabase pooler propagation delay)
        if (stderr.includes('Tenant or user not found') && attempt < maxRetries) {
          console.log(`[Migration] Supabase pooler may need time to recognize the user`);
          console.log(`[Migration] This is normal for new Supabase projects - user propagation can take 30-60 seconds`);
          console.log(`[Migration] Waiting ${retryDelay / 1000}s before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        // For other errors or final attempt, throw
        if (attempt === maxRetries) {
          throw lastError;
        }
      }
    }

    // After schema is created, enable pgvector and create embedding column
    console.log(`[Migration] Proceeding to enable pgvector...`);
    await enablePgVector(databaseUrl, tenantSlug);

    const duration = Date.now() - startTime;
    console.log(`[Migration] ========== MIGRATIONS COMPLETE ==========`);
    console.log(`[Migration] Total duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`[Migration] Tenant ${tenantSlug} database is ready`);

    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Migration] ========== MIGRATIONS FAILED ==========`);
    console.error(`[Migration] Duration: ${duration}ms`);
    console.error(`[Migration] Tenant: ${tenantSlug}`);

    // Extract detailed error info from execSync error
    const execError = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
    if (execError.stdout) {
      console.error(`[Migration] STDOUT:`, execError.stdout.toString());
    }
    if (execError.stderr) {
      console.error(`[Migration] STDERR:`, execError.stderr.toString());
    }
    if (execError.status !== undefined) {
      console.error(`[Migration] Exit code: ${execError.status}`);
    }
    console.error(`[Migration] Full error:`, error);
    throw error;
  }
}

/**
 * Initialize tenant data after database is provisioned
 * Creates the owner User and their initial Dataroom in the tenant DB
 */
async function initializeTenantData(
  masterDb: DbClient,
  tenant: TenantData,
  tenantSlug: string,
  databaseUrl?: string
) {
  const startTime = Date.now();
  console.log(`[TenantInit] ========== INITIALIZING TENANT DATA ==========`);
  console.log(`[TenantInit] Tenant ID: ${tenant.id}`);
  console.log(`[TenantInit] Tenant Slug: ${tenantSlug}`);
  console.log(`[TenantInit] Owner Email: ${tenant.email}`);
  console.log(`[TenantInit] Workspace Name: ${tenant.workspaceName || 'N/A'}`);
  console.log(`[TenantInit] Database URL provided: ${!!databaseUrl}`);
  console.log(`[TenantInit] Timestamp: ${new Date().toISOString()}`);

  try {
    // Run migrations on the new database first (if we have the database URL)
    if (databaseUrl) {
      console.log(`[TenantInit] Running database migrations first...`);
      await runTenantMigrations(databaseUrl, tenantSlug);
    } else {
      console.log(`[TenantInit] Skipping migrations - no database URL provided`);
    }

    // Use the provided database URL directly (TCP connection for provisioning)
    // Don't use getTenantDb() here since it looks up the stored socket URL
    // which won't work without Cloud SQL Proxy

    const { PrismaClient } = await import('@prisma/tenant-client');

    if (!databaseUrl) {
      throw new Error('Database URL required for tenant initialization');
    }

    console.log(`[TenantInit] Connecting to tenant database...`);
    const tenantDb = new PrismaClient({
      datasources: {
        db: { url: databaseUrl },
      },
    });

    // 1. Create or find Tenant record in tenant DB (for multi-tenancy tracking)
    console.log(`[TenantInit] Step 1/4: Creating/updating tenant record...`);
    await tenantDb.tenant.upsert({
      where: { slug: tenantSlug },
      create: {
        slug: tenantSlug,
        name: tenant.workspaceName || 'Workspace',
        email: tenant.email,
        isActive: true,
      },
      update: {},
    });
    console.log(`[TenantInit] Tenant record created/updated in tenant DB`);

    // 2. Create owner User in tenant DB
    console.log(`[TenantInit] Step 2/4: Creating owner user (${tenant.email})...`);
    const ownerUser = await tenantDb.user.create({
      data: {
        tenantSlug,
        email: tenant.email,
        fullName: tenant.fullName,
        role: 'owner',
        isActive: true,
        emailVerified: true,
      },
    });
    console.log(`[TenantInit] Owner user created: ${ownerUser.id}`);

    // 3. Create initial Dataroom
    // Get useCase from master DB tenant record (stored during onboarding)
    console.log(`[TenantInit] Step 3/4: Creating initial dataroom...`);
    const masterTenant = await masterDb.tenant.findUnique({
      where: { id: tenant.id },
      select: { useCase: true },
    });
    console.log(`[TenantInit] Use case: ${masterTenant?.useCase || 'single-firm (default)'}`);

    const dataroom = await tenantDb.dataroom.create({
      data: {
        tenantSlug,
        name: tenant.workspaceName || 'My Dataroom',
        description: `Dataroom for ${tenant.workspaceName || tenantSlug}`,
        ownerId: ownerUser.id,
        useCase: masterTenant?.useCase || 'single-firm',
        isActive: true,
      },
    });
    console.log(`[TenantInit] Dataroom created: ${dataroom.id}`);

    // 4. Create DataroomMember for owner
    console.log(`[TenantInit] Step 4/4: Creating dataroom membership for owner...`);
    await tenantDb.dataroomMember.create({
      data: {
        dataroomId: dataroom.id,
        userId: ownerUser.id,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      },
    });
    console.log(`[TenantInit] Owner added to dataroom as owner`);

    // Disconnect the Prisma client to clean up connection
    await tenantDb.$disconnect();

    const duration = Date.now() - startTime;
    console.log(`[TenantInit] ========== TENANT DATA INITIALIZED ==========`);
    console.log(`[TenantInit] Duration: ${duration}ms (${(duration / 1000).toFixed(1)}s)`);
    console.log(`[TenantInit] Owner User ID: ${ownerUser.id}`);
    console.log(`[TenantInit] Dataroom ID: ${dataroom.id}`);

    return { userId: ownerUser.id, dataroomId: dataroom.id };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[TenantInit] ========== TENANT INITIALIZATION FAILED ==========`);
    console.error(`[TenantInit] Duration: ${duration}ms`);
    console.error(`[TenantInit] Tenant: ${tenantSlug}`);
    console.error(`[TenantInit] Error:`, error);
    throw error;
  }
}

/**
 * Migrate pending invites to tenant database as users
 * This is called after the tenant database is provisioned
 */
async function migratePendingInvites(
  db: DbClient,
  tenantId: string,
  tenantSlug: string
) {
  const startTime = Date.now();
  console.log(`[InviteMigration] ========== MIGRATING PENDING INVITES ==========`);
  console.log(`[InviteMigration] Tenant ID: ${tenantId}`);
  console.log(`[InviteMigration] Tenant Slug: ${tenantSlug}`);
  console.log(`[InviteMigration] Timestamp: ${new Date().toISOString()}`);

  // Get all pending invites for this tenant
  console.log(`[InviteMigration] Fetching pending invites...`);
  const pendingInvites = await db.pendingInvite.findMany({
    where: {
      tenantId,
      status: 'PENDING',
    },
  });

  if (pendingInvites.length === 0) {
    console.log(`[InviteMigration] No pending invites found for tenant`);
    console.log(`[InviteMigration] ========== INVITE MIGRATION SKIPPED ==========`);
    return;
  }

  console.log(`[InviteMigration] Found ${pendingInvites.length} pending invites`);
  pendingInvites.forEach((invite, idx) => {
    console.log(`[InviteMigration]   ${idx + 1}. ${invite.email} (role: ${invite.role || 'N/A'})`);
  });

  // TODO: In a real implementation, this would:
  // 1. Connect to the tenant's provisioned database
  // 2. Create User records for each pending invite with status 'INVITED'
  // 3. Send invitation emails with sign-up links
  //
  // For now, we just mark the invites as migrated in master DB
  // The actual user creation in tenant DB will happen when the invited user signs up

  // Mark invites as migrated
  console.log(`[InviteMigration] Marking invites as migrated...`);
  await db.pendingInvite.updateMany({
    where: {
      tenantId,
      status: 'PENDING',
    },
    data: {
      migratedToTenantAt: new Date(),
    },
  });

  const duration = Date.now() - startTime;
  console.log(`[InviteMigration] ========== INVITE MIGRATION COMPLETE ==========`);
  console.log(`[InviteMigration] Duration: ${duration}ms`);
  console.log(`[InviteMigration] Migrated ${pendingInvites.length} invites`);
}

export async function POST(request: Request) {
  const requestStartTime = Date.now();
  console.log(`\n`);
  console.log(`╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║                    PROVISIONING API REQUEST RECEIVED                         ║`);
  console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
  console.log(`║ Timestamp: ${new Date().toISOString().padEnd(64)} ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝`);

  try {
    const { tenantId } = await request.json();
    console.log(`[Provision] Tenant ID from request: ${tenantId || 'NOT PROVIDED'}`);

    if (!tenantId) {
      console.error(`[Provision] ERROR: Tenant ID is required`);
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const db = getMasterDb();

    // Get tenant with onboarding session
    console.log(`[Provision] Looking up tenant in master database...`);
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { onboardingSession: true },
    });

    if (!tenant) {
      console.error(`[Provision] ERROR: Tenant not found: ${tenantId}`);
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.log(`[Provision] Tenant found:`);
    console.log(`[Provision]   - Slug: ${tenant.slug || 'N/A'}`);
    console.log(`[Provision]   - Status: ${tenant.status}`);
    console.log(`[Provision]   - Email: ${tenant.email}`);
    console.log(`[Provision]   - Provider: ${tenant.provisioningProvider || 'N/A'}`);
    console.log(`[Provision]   - Onboarding Session: ${tenant.onboardingSession ? 'Yes' : 'No'}`);

    // Check if already provisioned (check both Supabase and GCP fields)
    const isProvisioned = tenant.status === 'ACTIVE' && (
      tenant.supabaseProjectId ||
      tenant.cloudSqlInstanceName ||
      tenant.provisioningProvider === 'MOCK'
    );

    if (isProvisioned) {
      console.log(`[Provision] Tenant already provisioned - skipping`);
      console.log(`[Provision] Provider: ${tenant.provisioningProvider}`);
      return NextResponse.json({
        success: true,
        message: 'Tenant already provisioned',
        provider: tenant.provisioningProvider,
      });
    }
    console.log(`[Provision] Tenant not yet provisioned - proceeding...`);

    // Update onboarding session to PROVISIONING stage
    if (tenant.onboardingSession) {
      console.log(`[Provision] Updating onboarding session to PROVISIONING stage...`);
      await db.onboardingSession.update({
        where: { id: tenant.onboardingSession.id },
        data: {
          currentStage: 'PROVISIONING',
          provisioningAt: new Date(),
        },
      });
      console.log(`[Provision] Onboarding session updated`);
    }

    // Get the effective provisioning provider based on feature flags
    const provider: ProvisioningProvider = getEffectiveProvisioningProvider();
    console.log(`[Provision] ========================================`);
    console.log(`[Provision] Selected Provider: ${provider.toUpperCase()}`);
    console.log(`[Provision] ========================================`);

    try {
      let result: {
        success: boolean;
        message: string;
        tenantSlug?: string;
        databaseUrl?: string;
        resources?: unknown;
        warning?: string;
      };

      switch (provider) {
        case 'supabase':
          result = await provisionSupabase(db, tenantId, tenant);
          break;

        case 'pulumi':
          // Pulumi uses index-shared.ts when USE_SHARED_INSTANCE=true
          // which creates only DB + user (fast ~15-30 sec)
          result = await provisionPulumi(db, tenantId, tenant);
          break;

        case 'mock':
        default:
          result = await provisionMock(db, tenantId, tenant.slug || tenantId);
          break;
      }

      // After successful provisioning, initialize tenant data in tenant DB
      // Skip for mock mode since there's no separate tenant database
      if (provider !== 'mock') {
        // Pass the database URL for running migrations on the new database
        const databaseUrl = result.databaseUrl as string | undefined;

        // ============================================================
        // LOG TENANT DATABASE CREDENTIALS FOR MANUAL MIGRATIONS
        // Save these credentials to run migrations manually if needed
        // ============================================================
        if (databaseUrl) {
          console.log(`\n`);
          console.log(`╔══════════════════════════════════════════════════════════════════════════════╗`);
          console.log(`║                    TENANT DATABASE PROVISIONED                               ║`);
          console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
          console.log(`║ Tenant ID:    ${tenantId.padEnd(60)} ║`);
          console.log(`║ Tenant Slug:  ${(tenant.slug || tenantId).padEnd(60)} ║`);
          console.log(`║ Provider:     ${provider.padEnd(60)} ║`);
          console.log(`║ Timestamp:    ${new Date().toISOString().padEnd(60)} ║`);
          console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
          console.log(`║                    DATABASE CONNECTION DETAILS                               ║`);
          console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);

          // Parse the database URL to extract components
          try {
            const url = new URL(databaseUrl);
            console.log(`║ Host:         ${url.hostname.padEnd(60)} ║`);
            console.log(`║ Port:         ${(url.port || '5432').padEnd(60)} ║`);
            console.log(`║ Database:     ${url.pathname.replace('/', '').padEnd(60)} ║`);
            console.log(`║ Username:     ${url.username.padEnd(60)} ║`);
            console.log(`║ Password:     ${url.password.padEnd(60)} ║`);
            if (url.search) {
              console.log(`║ Params:       ${url.search.substring(1).padEnd(60)} ║`);
            }
          } catch {
            // If URL parsing fails, log the raw URL
            console.log(`║ (URL parsing failed - logging raw)                                          ║`);
          }

          console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
          console.log(`║ FULL DATABASE URL (for manual migrations):                                   ║`);
          console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
          console.log(`║ DATABASE_URL="${databaseUrl}"`);
          console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
          console.log(`║ Run migrations with:                                                         ║`);
          console.log(`║   DATABASE_URL="<url>" npx prisma@6 db push --schema=prisma/schema.prisma    ║`);
          console.log(`╚══════════════════════════════════════════════════════════════════════════════╝`);
          console.log(`\n`);
        }
        // ============================================================

        await initializeTenantData(db, tenant, tenant.slug || tenantId, databaseUrl);

        // NOW set status to ACTIVE after migrations and user creation complete
        // This prevents race condition where frontend tries to auth before DB is ready
        await db.tenant.update({
          where: { id: tenantId },
          data: { status: 'ACTIVE' },
        });
        console.log(`[Provision] Tenant ${tenant.slug || tenantId} status set to ACTIVE after migrations`);
      } else {
        console.log(`[Mock] Skipping tenant data initialization - mock mode uses master DB`);
      }

      // Then migrate pending invites
      await migratePendingInvites(db, tenantId, tenant.slug || tenantId);

      // Update onboarding session to ACTIVE stage
      if (tenant.onboardingSession) {
        console.log(`[Provision] Updating onboarding session to ACTIVE stage...`);
        await db.onboardingSession.update({
          where: { id: tenant.onboardingSession.id },
          data: {
            currentStage: 'ACTIVE',
            activatedAt: new Date(),
          },
        });
        console.log(`[Provision] Onboarding session updated to ACTIVE`);
      }

      const totalDuration = Date.now() - requestStartTime;
      console.log(`\n`);
      console.log(`╔══════════════════════════════════════════════════════════════════════════════╗`);
      console.log(`║                    PROVISIONING COMPLETED SUCCESSFULLY                       ║`);
      console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
      console.log(`║ Tenant ID:    ${tenantId.padEnd(60)} ║`);
      console.log(`║ Tenant Slug:  ${(tenant.slug || tenantId).padEnd(60)} ║`);
      console.log(`║ Provider:     ${provider.padEnd(60)} ║`);
      console.log(`║ Duration:     ${(totalDuration + 'ms (' + (totalDuration / 1000).toFixed(1) + 's)').padEnd(60)} ║`);
      console.log(`║ Status:       ${'SUCCESS'.padEnd(60)} ║`);
      console.log(`╚══════════════════════════════════════════════════════════════════════════════╝`);
      console.log(`\n`);

      return NextResponse.json(result);
    } catch (provisioningError) {
      // Log the error and fall back to mock mode
      console.error(`[Provision] ========== PROVISIONING FAILED ==========`);
      console.error(`[Provision] Provider: ${provider}`);
      console.error(`[Provision] Error:`, provisioningError);
      console.log(`[Provision] Falling back to mock provisioning...`);

      // Fall back to mock provisioning
      const mockResult = await provisionMock(db, tenantId, tenant.slug || tenantId);

      // Skip tenant data initialization in mock fallback mode
      // Mock mode uses master DB which has different schema
      console.log(`[Mock Fallback] Skipping tenant data initialization - mock mode uses master DB`);

      // Still migrate invites and update stage even with mock
      await migratePendingInvites(db, tenantId, tenant.slug || tenantId);

      if (tenant.onboardingSession) {
        console.log(`[Mock Fallback] Updating onboarding session to ACTIVE stage...`);
        await db.onboardingSession.update({
          where: { id: tenant.onboardingSession.id },
          data: {
            currentStage: 'ACTIVE',
            activatedAt: new Date(),
          },
        });
      }

      const totalDuration = Date.now() - requestStartTime;
      console.log(`\n`);
      console.log(`╔══════════════════════════════════════════════════════════════════════════════╗`);
      console.log(`║                    PROVISIONING COMPLETED (MOCK FALLBACK)                    ║`);
      console.log(`╠══════════════════════════════════════════════════════════════════════════════╣`);
      console.log(`║ Tenant ID:    ${tenantId.padEnd(60)} ║`);
      console.log(`║ Tenant Slug:  ${(tenant.slug || tenantId).padEnd(60)} ║`);
      console.log(`║ Provider:     ${'MOCK (fallback)'.padEnd(60)} ║`);
      console.log(`║ Duration:     ${(totalDuration + 'ms (' + (totalDuration / 1000).toFixed(1) + 's)').padEnd(60)} ║`);
      console.log(`║ Status:       ${'FALLBACK'.padEnd(60)} ║`);
      console.log(`║ Original:     ${provider.padEnd(60)} ║`);
      console.log(`╚══════════════════════════════════════════════════════════════════════════════╝`);
      console.log(`\n`);

      return NextResponse.json({
        ...mockResult,
        message: `${mockResult.message} (fallback from ${provider} failure)`,
        warning: provisioningError instanceof Error ? provisioningError.message : 'Provisioning failed',
      });
    }
  } catch (error) {
    const totalDuration = Date.now() - requestStartTime;
    console.error(`\n`);
    console.error(`╔══════════════════════════════════════════════════════════════════════════════╗`);
    console.error(`║                    PROVISIONING FAILED - CRITICAL ERROR                      ║`);
    console.error(`╠══════════════════════════════════════════════════════════════════════════════╣`);
    console.error(`║ Duration:     ${(totalDuration + 'ms').padEnd(60)} ║`);
    console.error(`║ Status:       ${'FAILED'.padEnd(60)} ║`);
    console.error(`╚══════════════════════════════════════════════════════════════════════════════╝`);
    console.error(`[Provision] Error details:`, error);

    return NextResponse.json(
      {
        error: 'Failed to provision tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
