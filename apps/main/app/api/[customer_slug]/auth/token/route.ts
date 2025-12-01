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

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });
    }

    // Get session from cookies
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify session belongs to this tenant
    if (session.tenantSlug !== tenantSlug) {
      return NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 });
    }

    // Get tenant from master DB to verify status
    const db = getMasterDb();
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Tenant not active' },
        { status: 403 }
      );
    }

    // Get user from tenant database
    const tenantDb = await getTenantDb(tenantSlug);
    const user = await tenantDb.user.findFirst({
      where: {
        email: session.email,
        tenantSlug,
      },
    });

    if (!user) {
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
