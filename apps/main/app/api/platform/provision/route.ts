import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getMasterDb, schema } from '@/lib/master-db';
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

/**
 * Mock provisioning - for development/testing
 */
async function provisionMock(
  db: ReturnType<typeof getMasterDb>,
  tenantId: string,
  tenantSlug: string
) {
  console.log(`[Mock] Provisioning tenant: ${tenantSlug}`);

  await db
    .update(schema.tenants)
    .set({
      status: 'active',
      provisioningProvider: 'mock',
      supabaseProjectId: `mock_${tenantSlug}`,
      supabaseProjectRef: `mock_ref_${tenantSlug}`,
      databaseUrlEncrypted: 'mock_encrypted_url',
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));

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
  db: ReturnType<typeof getMasterDb>,
  tenantId: string,
  tenant: { slug: string; name: string; settings: unknown }
) {
  console.log(`[Supabase] Starting provisioning for tenant: ${tenant.name} (${tenant.slug})`);

  // Update status to provisioning
  await db
    .update(schema.tenants)
    .set({
      status: 'provisioning',
      provisioningProvider: 'supabase',
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));

  // Create Supabase project
  const projectName = `tequity-${tenant.slug}`.slice(0, 40);
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
  await db
    .update(schema.tenants)
    .set({
      status: 'active',
      provisioningProvider: 'supabase',
      supabaseProjectId: credentials.projectId,
      supabaseProjectRef: project.ref,
      databaseUrlEncrypted: encryptedUrl,
      settings: {
        ...(tenant.settings as object || {}),
        credentialsEncrypted: encryptedCredentials,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));

  console.log(`[Supabase] Provisioning complete for tenant: ${tenant.slug}`);

  return {
    success: true,
    message: 'Tenant provisioned successfully (Supabase)',
    tenantSlug: tenant.slug,
  };
}

/**
 * Pulumi/GCP provisioning - uses Pulumi Automation API
 */
async function provisionPulumi(
  db: ReturnType<typeof getMasterDb>,
  tenantId: string,
  tenant: { slug: string; name: string; settings: unknown }
) {
  console.log(`[Pulumi/GCP] Starting provisioning for tenant: ${tenant.name} (${tenant.slug})`);

  // Determine environment from NODE_ENV
  const environment = process.env.NODE_ENV === 'production' ? 'production' :
                     process.env.NODE_ENV === 'staging' ? 'staging' : 'development';

  // Update status to provisioning
  await db
    .update(schema.tenants)
    .set({
      status: 'provisioning',
      provisioningProvider: 'gcp',
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));

  const provisionWithPulumi = await getProvisionWithPulumi();
  const result = await provisionWithPulumi({
    tenantId,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    environment: environment as 'development' | 'staging' | 'production',
    region: process.env.GCP_REGION || 'us-central1',
  });

  if (!result.success) {
    throw new Error(result.error || 'Pulumi provisioning failed');
  }

  // Encrypt credentials
  const encryptedDbUrl = result.databaseUrl ? encrypt(result.databaseUrl) : null;
  const encryptedServiceAccountKey = result.serviceAccountKeyJson
    ? encrypt(result.serviceAccountKeyJson)
    : null;

  // Update tenant with GCP provisioning details
  await db
    .update(schema.tenants)
    .set({
      status: 'active',
      provisioningProvider: 'gcp',

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
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));

  console.log(`[Pulumi/GCP] Provisioning complete for tenant: ${tenant.slug}`);
  console.log(`[Pulumi/GCP] Cloud SQL: ${result.cloudSqlInstanceName}`);
  console.log(`[Pulumi/GCP] Storage: ${result.storageBucketName}`);
  console.log(`[Pulumi/GCP] Service Account: ${result.serviceAccountEmail}`);

  return {
    success: true,
    message: 'Tenant provisioned successfully (GCP via Pulumi)',
    tenantSlug: tenant.slug,
    resources: {
      cloudSqlInstance: result.cloudSqlInstanceName,
      storageBucket: result.storageBucketName,
      serviceAccount: result.serviceAccountEmail,
    },
  };
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    const db = getMasterDb();

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if already provisioned (check both Supabase and GCP fields)
    const isProvisioned = tenant.status === 'active' && (
      tenant.supabaseProjectId ||
      tenant.cloudSqlInstanceName ||
      tenant.provisioningProvider === 'mock'
    );

    if (isProvisioned) {
      return NextResponse.json({
        success: true,
        message: 'Tenant already provisioned',
        provider: tenant.provisioningProvider,
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
          result = await provisionPulumi(db, tenantId, tenant);
          break;

        case 'mock':
        default:
          result = await provisionMock(db, tenantId, tenant.slug);
          break;
      }

      return NextResponse.json(result);
    } catch (provisioningError) {
      // Log the error and fall back to mock mode
      console.error(`[${provider}] Provisioning failed:`, provisioningError);

      // Fall back to mock provisioning
      console.log('Falling back to mock provisioning...');
      const mockResult = await provisionMock(db, tenantId, tenant.slug);

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
