import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getMasterDb, schema } from '@/lib/master-db';
import {
  createSupabaseProject,
  waitForProjectReady,
  getTenantCredentials,
} from '@tequity/utils';
import { encryptDatabaseUrl } from '@tequity/utils';

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

    // Check if already provisioned
    if (tenant.status === 'active' && tenant.supabaseProjectId) {
      return NextResponse.json({
        success: true,
        message: 'Tenant already provisioned',
      });
    }

    // Check if Supabase credentials are configured
    const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;

    if (!supabaseAccessToken) {
      // Mock provisioning for development
      console.log('SUPABASE_ACCESS_TOKEN not set, using mock provisioning');

      await db
        .update(schema.tenants)
        .set({
          status: 'active',
          supabaseProjectId: `mock_${tenant.slug}`,
          databaseUrlEncrypted: 'mock_encrypted_url',
          provisioningCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.tenants.id, tenantId));

      return NextResponse.json({
        success: true,
        message: 'Tenant provisioned (mock mode)',
        tenantSlug: tenant.slug,
      });
    }

    // Real Supabase provisioning
    console.log(`Starting provisioning for tenant: ${tenant.name} (${tenant.slug})`);

    // Update status to provisioning
    await db
      .update(schema.tenants)
      .set({
        status: 'provisioning',
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, tenantId));

    // Create Supabase project
    const projectName = `tequity-${tenant.slug}`.slice(0, 40); // Supabase has name length limits
    const project = await createSupabaseProject(projectName);

    if (!project.ref) {
      throw new Error('Failed to create Supabase project');
    }

    // Wait for project to be ready
    const isReady = await waitForProjectReady(project.ref);

    if (!isReady) {
      throw new Error('Supabase project provisioning timed out');
    }

    // Get database credentials
    const credentials = await getTenantCredentials(project.ref, project.db_pass);

    // Encrypt the database URL
    const encryptedUrl = await encryptDatabaseUrl(credentials.connectionString);

    // Update tenant with Supabase project details
    await db
      .update(schema.tenants)
      .set({
        status: 'active',
        supabaseProjectId: project.ref,
        databaseUrlEncrypted: encryptedUrl,
        provisioningCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, tenantId));

    console.log(`Provisioning complete for tenant: ${tenant.slug}`);

    return NextResponse.json({
      success: true,
      message: 'Tenant provisioned successfully',
      tenantSlug: tenant.slug,
    });
  } catch (error) {
    console.error('Provisioning error:', error);

    // Try to update tenant status to failed
    try {
      const { tenantId } = await request.json();
      if (tenantId) {
        const db = getMasterDb();
        await db
          .update(schema.tenants)
          .set({
            status: 'suspended', // Use suspended for failed provisioning
            updatedAt: new Date(),
          })
          .where(eq(schema.tenants.id, tenantId));
      }
    } catch {
      // Ignore errors in error handler
    }

    return NextResponse.json(
      { error: 'Failed to provision tenant' },
      { status: 500 }
    );
  }
}
