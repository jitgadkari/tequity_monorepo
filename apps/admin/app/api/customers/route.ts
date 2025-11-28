import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { like, or, asc, desc, sql, eq } from 'drizzle-orm';
import { requireAdmin, validateServiceApiKey } from '@/lib/auth';

const { tenants } = schema;

// GET /api/customers - List all tenants with search and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');

    // Check for service-to-service authentication
    const isServiceCall = validateServiceApiKey(request);

    // Service endpoint: GET /api/customers?slug=xxx
    if (slug && isServiceCall) {
      const result = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, slug))
        .limit(1);

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: result[0] });
    }

    // Admin authentication required for listing tenants
    await requireAdmin();

    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build search conditions
    const searchConditions = search
      ? or(
          like(tenants.name, `%${search}%`),
          like(tenants.slug, `%${search}%`)
        )
      : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tenants)
      .where(searchConditions);

    const totalCount = Number(countResult.count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get tenants with pagination
    const orderColumn = sortBy === 'updatedAt' ? tenants.updatedAt : tenants.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    const result = await db
      .select()
      .from(tenants)
      .where(searchConditions)
      .orderBy(orderDirection)
      .limit(limit)
      .offset(offset);

    // Transform to match frontend expectations
    const customers = result.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      email: tenant.slug, // Using slug as identifier
      slug: tenant.slug,
      plan: 'starter', // Will come from subscriptions table
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
    }));

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}

// Helper to generate consistent color from string
function getColorFromString(str: string): string {
  const colors = ['#FF5722', '#2196F3', '#9C27B0', '#795548', '#607D8B', '#FF9800', '#424242', '#4CAF50', '#E91E63'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// POST /api/customers - Create a new tenant
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const { name, slug, useCase, companySize, industry } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const tenantSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existing = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, tenantSlug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A tenant with this slug already exists' },
        { status: 400 }
      );
    }

    // Insert new tenant
    const [newTenant] = await db
      .insert(tenants)
      .values({
        name,
        slug: tenantSlug,
        status: 'pending_onboarding',
        useCase,
        companySize,
        industry,
      })
      .returning();

    return NextResponse.json(newTenant, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    );
  }
}
