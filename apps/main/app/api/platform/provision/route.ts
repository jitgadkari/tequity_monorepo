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
  console.log(`[Mock] Provisioning tenant: ${tenantSlug}`);

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
  const tenantSlug = tenant.slug || tenantId;
  const tenantName = tenant.workspaceName || 'Workspace';

  console.log(`[Supabase] Starting provisioning for tenant: ${tenantName} (${tenantSlug})`);

  // Update status to provisioning
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'PROVISIONING',
      provisioningProvider: 'SUPABASE',
    },
  });

  // Create Supabase project
  const projectName = `tequity-${tenantSlug}`.slice(0, 40);
  const { project, dbPassword } = await createSupabaseProject(projectName);

  if (!project.ref) {
    throw new Error('Failed to create Supabase project: no project ref returned');
  }

  console.log(`[Supabase] Project created: ${project.ref}, waiting for it to be ready...`);

  // Wait for project to be ready
  await waitForProjectReady(project.ref);

  console.log(`[Supabase] Project ${project.ref} is ready, fetching credentials...`);

  // Get database credentials
  const credentials = await getTenantCredentials(project.ref, dbPassword);

  // Encrypt the database URL and credentials
  const encryptedUrl = encrypt(credentials.databaseUrl);
  const encryptedCredentials = encrypt(JSON.stringify({
    supabaseUrl: credentials.supabaseUrl,
    anonKey: credentials.anonKey,
    serviceRoleKey: credentials.serviceRoleKey,
    databasePassword: credentials.databasePassword,
  }));

  // Update tenant with Supabase project details
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE',
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

  console.log(`[Supabase] Provisioning complete for tenant: ${tenantSlug}`);

  return {
    success: true,
    message: 'Tenant provisioned successfully (Supabase)',
    tenantSlug,
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
  const tenantSlug = tenant.slug || tenantId;
  const tenantName = tenant.workspaceName || 'Workspace';

  console.log(`[Pulumi/GCP] Starting provisioning for tenant: ${tenantName} (${tenantSlug})`);

  // Determine environment from NODE_ENV or DEPLOY_ENV
  const deployEnv = process.env.DEPLOY_ENV || process.env.NODE_ENV;
  const environment: 'development' | 'staging' | 'production' =
    deployEnv === 'production' ? 'production' :
    deployEnv === 'staging' ? 'staging' : 'development';

  // Update status to provisioning
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'PROVISIONING',
      provisioningProvider: 'GCP',
    },
  });

  // Check if we should use shared instance mode (fast provisioning)
  const useSharedInstance = process.env.USE_SHARED_INSTANCE === 'true';
  console.log(`[Pulumi/GCP] Using ${useSharedInstance ? 'SHARED' : 'DEDICATED'} instance mode`);

  const provisionWithPulumi = await getProvisionWithPulumi();
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

  if (!result.success) {
    throw new Error(result.error || 'Pulumi provisioning failed');
  }

  // Encrypt credentials
  // For storage: Only use Cloud SQL Proxy socket URL when Cloud SQL Proxy is deployed
  // Currently using direct TCP URL for all environments until Cloud SQL Proxy sidecar is added
  // TODO: Switch to socket URL when Cloud SQL Auth Proxy is deployed as sidecar
  // const dbUrlForStorage = process.env.DEPLOY_ENV === 'production' && process.env.USE_CLOUD_SQL_PROXY === 'true'
  //   ? result.databaseUrl
  //   : result.directDatabaseUrl || result.databaseUrl;
  const dbUrlForStorage = result.directDatabaseUrl || result.databaseUrl;
  const dbUrlForMigrations = result.directDatabaseUrl || result.databaseUrl;
  const encryptedDbUrl = dbUrlForStorage ? encrypt(dbUrlForStorage) : null;
  const encryptedServiceAccountKey = result.serviceAccountKeyJson
    ? encrypt(result.serviceAccountKeyJson)
    : null;

  // Update tenant with GCP provisioning details
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      status: 'ACTIVE',
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

  console.log(`[Pulumi/GCP] Provisioning complete for tenant: ${tenantSlug}`);
  console.log(`[Pulumi/GCP] Cloud SQL: ${result.cloudSqlInstanceName}`);
  console.log(`[Pulumi/GCP] Storage: ${result.storageBucketName}`);
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
  console.log(`[Provision] Enabling pgvector for tenant: ${tenantSlug}`);

  const { PrismaClient } = await import('@prisma/tenant-client');
  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  try {
    // Enable pgvector extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log(`[Provision] pgvector extension enabled`);

    // Add embedding column to DocumentEmbedding table if it doesn't exist
    // Using 1536 dimensions for OpenAI ada-002 embeddings
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "DocumentEmbedding"
      ADD COLUMN IF NOT EXISTS embedding vector(1536)
    `);
    console.log(`[Provision] embedding column added to DocumentEmbedding`);

    // Create index for cosine similarity search
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS document_embedding_vector_idx
      ON "DocumentEmbedding"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log(`[Provision] Vector index created`);

    await prisma.$disconnect();
    console.log(`[Provision] pgvector setup completed for tenant: ${tenantSlug}`);
    return true;
  } catch (error) {
    await prisma.$disconnect();
    console.error(`[Provision] pgvector setup failed for tenant ${tenantSlug}:`, error);
    // Don't throw - pgvector is optional, file uploads can still work without embeddings
    console.warn(`[Provision] Continuing without pgvector - embeddings will be disabled`);
    return false;
  }
}

/**
 * Run Prisma migrations on a new tenant database
 * This creates all the required tables in the newly provisioned database
 */
async function runTenantMigrations(databaseUrl: string, tenantSlug: string) {
  console.log(`[Provision] Running migrations for tenant: ${tenantSlug}`);

  const { execSync } = await import('child_process');
  const path = await import('path');

  // Get the path to the tenant prisma schema
  const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');

  try {
    // Run prisma db push to create tables (works better than migrate for new DBs)
    // We use db push since we don't need migration history for fresh tenant DBs
    // Pin to Prisma 6.x - v7 has breaking changes (removes datasource url from schema)
    execSync(`npx prisma@6 db push --schema="${schemaPath}" --accept-data-loss --skip-generate`, {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'pipe',
      timeout: 120000, // 2 minute timeout
    });

    console.log(`[Provision] Migrations completed successfully for tenant: ${tenantSlug}`);

    // After schema is created, enable pgvector and create embedding column
    await enablePgVector(databaseUrl, tenantSlug);

    return true;
  } catch (error) {
    console.error(`[Provision] Migration failed for tenant ${tenantSlug}:`, error);
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
  console.log(`[Provision] Initializing tenant data for: ${tenantSlug}`);

  try {
    // Run migrations on the new database first (if we have the database URL)
    if (databaseUrl) {
      await runTenantMigrations(databaseUrl, tenantSlug);
    }

    // Use the provided database URL directly (TCP connection for provisioning)
    // Don't use getTenantDb() here since it looks up the stored socket URL
    // which won't work without Cloud SQL Proxy
    const { PrismaClient } = await import('@prisma/tenant-client');

    if (!databaseUrl) {
      throw new Error('Database URL required for tenant initialization');
    }

    const tenantDb = new PrismaClient({
      datasources: {
        db: { url: databaseUrl },
      },
    });

    // 1. Create or find Tenant record in tenant DB (for multi-tenancy tracking)
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

    console.log(`[Provision] Created/updated tenant record in tenant DB`);

    // 2. Create owner User in tenant DB
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

    console.log(`[Provision] Created owner user: ${ownerUser.id}`);

    // 3. Create initial Dataroom
    // Get useCase from master DB tenant record (stored during onboarding)
    const masterTenant = await masterDb.tenant.findUnique({
      where: { id: tenant.id },
      select: { useCase: true },
    });

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

    console.log(`[Provision] Created dataroom: ${dataroom.id}`);

    // 4. Create DataroomMember for owner
    await tenantDb.dataroomMember.create({
      data: {
        dataroomId: dataroom.id,
        userId: ownerUser.id,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      },
    });

    console.log(`[Provision] Tenant data initialized successfully`);

    // Disconnect the Prisma client to clean up connection
    await tenantDb.$disconnect();

    return { userId: ownerUser.id, dataroomId: dataroom.id };
  } catch (error) {
    console.error(`[Provision] Error initializing tenant data:`, error);
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
  _tenantSlug: string
) {
  // Get all pending invites for this tenant
  const pendingInvites = await db.pendingInvite.findMany({
    where: {
      tenantId,
      status: 'PENDING',
    },
  });

  if (pendingInvites.length === 0) {
    console.log(`[Migration] No pending invites to migrate for tenant: ${tenantId}`);
    return;
  }

  console.log(`[Migration] Migrating ${pendingInvites.length} pending invites for tenant: ${tenantId}`);

  // TODO: In a real implementation, this would:
  // 1. Connect to the tenant's provisioned database
  // 2. Create User records for each pending invite with status 'INVITED'
  // 3. Send invitation emails with sign-up links
  //
  // For now, we just mark the invites as migrated in master DB
  // The actual user creation in tenant DB will happen when the invited user signs up

  // Mark invites as migrated
  await db.pendingInvite.updateMany({
    where: {
      tenantId,
      status: 'PENDING',
    },
    data: {
      migratedToTenantAt: new Date(),
    },
  });

  console.log(`[Migration] Successfully marked ${pendingInvites.length} invites as migrated`);
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const db = getMasterDb();

    // Get tenant with onboarding session
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: { onboardingSession: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if already provisioned (check both Supabase and GCP fields)
    const isProvisioned = tenant.status === 'ACTIVE' && (
      tenant.supabaseProjectId ||
      tenant.cloudSqlInstanceName ||
      tenant.provisioningProvider === 'MOCK'
    );

    if (isProvisioned) {
      return NextResponse.json({
        success: true,
        message: 'Tenant already provisioned',
        provider: tenant.provisioningProvider,
      });
    }

    // Update onboarding session to PROVISIONING stage
    if (tenant.onboardingSession) {
      await db.onboardingSession.update({
        where: { id: tenant.onboardingSession.id },
        data: {
          currentStage: 'PROVISIONING',
          provisioningAt: new Date(),
        },
      });
    }

    // Get the effective provisioning provider based on feature flags
    const provider: ProvisioningProvider = getEffectiveProvisioningProvider();
    console.log(`Using provisioning provider: ${provider}`);

    try {
      let result;

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
        await initializeTenantData(db, tenant, tenant.slug || tenantId, databaseUrl);
      } else {
        console.log(`[Mock] Skipping tenant data initialization - mock mode uses master DB`);
      }

      // Then migrate pending invites
      await migratePendingInvites(db, tenantId, tenant.slug || tenantId);

      // Update onboarding session to ACTIVE stage
      if (tenant.onboardingSession) {
        await db.onboardingSession.update({
          where: { id: tenant.onboardingSession.id },
          data: {
            currentStage: 'ACTIVE',
            activatedAt: new Date(),
          },
        });
      }

      return NextResponse.json(result);
    } catch (provisioningError) {
      // Log the error and fall back to mock mode
      console.error(`[${provider}] Provisioning failed:`, provisioningError);

      // Fall back to mock provisioning
      console.log('Falling back to mock provisioning...');
      const mockResult = await provisionMock(db, tenantId, tenant.slug || tenantId);

      // Skip tenant data initialization in mock fallback mode
      // Mock mode uses master DB which has different schema
      console.log(`[Mock Fallback] Skipping tenant data initialization - mock mode uses master DB`);

      // Still migrate invites and update stage even with mock
      await migratePendingInvites(db, tenantId, tenant.slug || tenantId);

      if (tenant.onboardingSession) {
        await db.onboardingSession.update({
          where: { id: tenant.onboardingSession.id },
          data: {
            currentStage: 'ACTIVE',
            activatedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        ...mockResult,
        message: `${mockResult.message} (fallback from ${provider} failure)`,
        warning: provisioningError instanceof Error ? provisioningError.message : 'Provisioning failed',
      });
    }
  } catch (error) {
    console.error('Provisioning error:', error);

    return NextResponse.json(
      {
        error: 'Failed to provision tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
