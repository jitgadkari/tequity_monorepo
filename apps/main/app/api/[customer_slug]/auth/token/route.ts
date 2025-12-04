import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createToken } from '@/lib/auth';
import { getMasterDb } from '@/lib/master-db';
import { getTenantDb, isValidTenantSlug } from '@/lib/db';

/**
 * GET /api/[customer_slug]/auth/token
 *
 * Exchange a valid session cookie for a JWT token.
 * This is used after provisioning completes to get an API token
 * for authenticated API calls (file uploads, etc.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string }> }
) {
  try {
    const { customer_slug: tenantSlug } = await params;
    console.log(`[AUTH/TOKEN] Request for tenant: ${tenantSlug}`);

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      console.log(`[AUTH/TOKEN] Invalid tenant slug format: ${tenantSlug}`);
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });
    }

    // Get session from cookies
    const session = await getSession();
    console.log(`[AUTH/TOKEN] Session:`, session ? {
      tenantId: session.tenantId,
      email: session.email,
      tenantSlug: session.tenantSlug,
      emailVerified: session.emailVerified,
    } : 'null');

    if (!session) {
      console.log(`[AUTH/TOKEN] No session found - returning 401`);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify session belongs to this tenant
    if (session.tenantSlug !== tenantSlug) {
      console.log(`[AUTH/TOKEN] Tenant mismatch - session.tenantSlug: ${session.tenantSlug}, requested: ${tenantSlug}`);
      return NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 });
    }

    // Get tenant from master DB to verify status
    const db = getMasterDb();
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        slug: true,
        email: true,
        status: true,
        databaseUrlEncrypted: true,
        provisioningProvider: true,
      },
    });

    console.log(`[AUTH/TOKEN] Tenant from master DB:`, tenant ? {
      id: tenant.id,
      slug: tenant.slug,
      status: tenant.status,
      provider: tenant.provisioningProvider,
      hasDbUrl: !!tenant.databaseUrlEncrypted,
    } : 'null');

    if (!tenant) {
      console.log(`[AUTH/TOKEN] Tenant not found in master DB: ${tenantSlug}`);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    if (tenant.status !== 'ACTIVE') {
      console.log(`[AUTH/TOKEN] Tenant not active - status: ${tenant.status}`);
      return NextResponse.json(
        { error: `Tenant not active (status: ${tenant.status})` },
        { status: 403 }
      );
    }

    // Get user from tenant database
    console.log(`[AUTH/TOKEN] Getting tenant database connection...`);
    const tenantDb = await getTenantDb(tenantSlug);
    console.log(`[AUTH/TOKEN] Tenant database connection obtained, searching for user: ${session.email}`);

    const user = await tenantDb.user.findFirst({
      where: {
        email: session.email,
        tenantSlug,
      },
    });

    console.log(`[AUTH/TOKEN] User query result:`, user ? {
      id: user.id,
      email: user.email,
      role: user.role,
    } : 'null');

    if (!user) {
      console.log(`[AUTH/TOKEN] User not found in tenant database - email: ${session.email}, tenantSlug: ${tenantSlug}`);
      return NextResponse.json(
        { error: 'User not found in tenant database' },
        { status: 404 }
      );
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      tenantSlug,
      role: user.role,
    });

    console.log(`[AUTH/TOKEN] Token created successfully for user: ${user.id}`);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantSlug,
      },
    });
  } catch (error) {
    console.error('[AUTH/TOKEN] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
