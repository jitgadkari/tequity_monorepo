import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Helper to generate consistent color from string
function getColorFromString(str: string): string {
  const colors = ['#FF5722', '#2196F3', '#9C27B0', '#795548', '#607D8B', '#FF9800', '#424242', '#4CAF50', '#E91E63'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// GET /api/customers/[id] - Get a single tenant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const tenant = await db.tenant.findUnique({
      where: { id },
      include: {
        onboardingSession: {
          select: {
            currentStage: true,
          },
        },
        subscription: {
          select: {
            plan: true,
            status: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const displayName = tenant.workspaceName || tenant.email;

    // Transform to match frontend expectations
    const customer = {
      id: tenant.id,
      name: displayName,
      email: tenant.email,
      slug: tenant.slug,
      plan: tenant.subscription?.plan || 'starter',
      status: tenant.status === 'ACTIVE' ? 'active' :
              tenant.status === 'SUSPENDED' ? 'inactive' : 'pending',
      stage: tenant.onboardingSession?.currentStage || 'SIGNUP_STARTED',
      lastActive: tenant.updatedAt,
      logo: displayName.charAt(0).toUpperCase(),
      logoColor: getColorFromString(displayName),
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      useCase: tenant.useCase,
      // Raw tenant data
      rawStatus: tenant.status,
      provisioningProvider: tenant.provisioningProvider,
      supabaseProjectRef: tenant.supabaseProjectRef,
      cloudSqlInstanceName: tenant.cloudSqlInstanceName,
    };

    return NextResponse.json(customer);
  } catch (error: unknown) {
    console.error('Error fetching tenant:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
}

// PATCH /api/customers/[id] - Update a tenant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    // Map frontend fields to tenant schema
    // TenantStatus enum: PENDING_ONBOARDING | PENDING_PAYMENT | PROVISIONING | ACTIVE | SUSPENDED | CANCELLED
    const updateData: {
      workspaceName?: string;
      useCase?: string;
      status?: 'PENDING_ONBOARDING' | 'PENDING_PAYMENT' | 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
    } = {};

    if (body.name !== undefined) updateData.workspaceName = body.name;
    if (body.useCase !== undefined) updateData.useCase = body.useCase;

    // Map status
    if (body.status !== undefined) {
      const statusMap: Record<string, 'PENDING_ONBOARDING' | 'PENDING_PAYMENT' | 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'> = {
        'active': 'ACTIVE',
        'inactive': 'SUSPENDED',
        'pending': 'PENDING_ONBOARDING',
        'cancelled': 'CANCELLED',
      };
      updateData.status = statusMap[body.status] || body.status;
    }

    const updatedTenant = await db.tenant.update({
      where: { id },
      data: updateData,
    });

    if (!updatedTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTenant);
  } catch (error: unknown) {
    console.error('Error updating tenant:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id] - Delete a tenant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Delete related records first (onboarding session, subscription, pending invites)
    await db.onboardingSession.deleteMany({
      where: { tenantId: id },
    });

    await db.subscription.deleteMany({
      where: { tenantId: id },
    });

    await db.pendingInvite.deleteMany({
      where: { tenantId: id },
    });

    await db.verificationToken.deleteMany({
      where: { tenantId: id },
    });

    // Delete the tenant
    const deletedTenant = await db.tenant.delete({
      where: { id },
    });

    if (!deletedTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Tenant deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting tenant:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    );
  }
}
