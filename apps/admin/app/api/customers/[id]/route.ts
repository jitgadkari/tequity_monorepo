import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

const { tenants } = schema;

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

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Transform to match frontend expectations
    const customer = {
      id: tenant.id,
      name: tenant.name,
      email: tenant.slug,
      slug: tenant.slug,
      plan: 'starter', // Will come from subscriptions
      status: tenant.status === 'active' ? 'active' :
              tenant.status === 'suspended' ? 'inactive' : 'pending',
      lastActive: tenant.updatedAt,
      logo: tenant.name.charAt(0).toUpperCase(),
      logoColor: getColorFromString(tenant.name),
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      useCase: tenant.useCase,
      companySize: tenant.companySize,
      industry: tenant.industry,
      // Raw tenant data
      rawStatus: tenant.status,
      provisioningProvider: tenant.provisioningProvider,
      supabaseProjectRef: tenant.supabaseProjectRef,
      cloudSqlInstanceName: tenant.cloudSqlInstanceName,
    };

    return NextResponse.json(customer);
  } catch (error: any) {
    console.error('Error fetching tenant:', error);
    if (error.message === 'Unauthorized') {
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
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.useCase !== undefined) updateData.useCase = body.useCase;
    if (body.companySize !== undefined) updateData.companySize = body.companySize;
    if (body.industry !== undefined) updateData.industry = body.industry;

    // Map status
    if (body.status !== undefined) {
      const statusMap: Record<string, string> = {
        'active': 'active',
        'inactive': 'suspended',
        'pending': 'pending_onboarding',
      };
      updateData.status = statusMap[body.status] || body.status;
    }

    updateData.updatedAt = new Date();

    const [updatedTenant] = await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.id, id))
      .returning();

    if (!updatedTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTenant);
  } catch (error: any) {
    console.error('Error updating tenant:', error);
    if (error.message === 'Unauthorized') {
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

    const [deletedTenant] = await db
      .delete(tenants)
      .where(eq(tenants.id, id))
      .returning();

    if (!deletedTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Tenant deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting tenant:', error);
    if (error.message === 'Unauthorized') {
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
