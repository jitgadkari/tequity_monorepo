import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, validateServiceApiKey } from '@/lib/auth';

// GET /api/customers - List all tenants with search and pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');

    // Check for service-to-service authentication
    const isServiceCall = validateServiceApiKey(request);

    // Service endpoint: GET /api/customers?slug=xxx
    if (slug && isServiceCall) {
      const tenant = await db.tenant.findUnique({
        where: { slug },
      });

      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: tenant });
    }

    // Admin authentication required for listing tenants
    await requireAdmin();

    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset
    const skip = (page - 1) * limit;

    // Build search conditions
    const searchConditions = search
      ? {
          OR: [
            { workspaceName: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get total count
    const totalCount = await db.tenant.count({
      where: searchConditions,
    });

    const totalPages = Math.ceil(totalCount / limit);

    // Get tenants with pagination and include onboarding session for stage
    const tenants = await db.tenant.findMany({
      where: searchConditions,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
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

    // Transform to match frontend expectations
    const customers = tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.workspaceName || tenant.email,
      email: tenant.email,
      slug: tenant.slug,
      plan: tenant.subscription?.plan || 'starter',
      status: tenant.status === 'ACTIVE' ? 'active' :
              tenant.status === 'SUSPENDED' ? 'inactive' : 'pending',
      rawStatus: tenant.status,
      stage: tenant.onboardingSession?.currentStage || 'SIGNUP_STARTED',
      lastActive: tenant.updatedAt,
      logo: (tenant.workspaceName || tenant.email || 'T').charAt(0).toUpperCase(),
      logoColor: getColorFromString(tenant.workspaceName || tenant.email || 'Tenant'),
      ownerEmail: tenant.email,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      useCase: tenant.useCase,
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
  } catch (error: unknown) {
    console.error('Error fetching tenants:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
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

    const { name, email, slug, useCase } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const tenantSlug = slug || (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existingSlug = await db.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'A tenant with this slug already exists' },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingEmail = await db.tenant.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'A tenant with this email already exists' },
        { status: 400 }
      );
    }

    // Insert new tenant with onboarding session
    const newTenant = await db.tenant.create({
      data: {
        email,
        workspaceName: name,
        slug: tenantSlug,
        status: 'PENDING_ONBOARDING',
        useCase,
        emailVerified: false,
        onboardingSession: {
          create: {
            currentStage: 'SIGNUP_STARTED',
          },
        },
      },
      include: {
        onboardingSession: true,
      },
    });

    return NextResponse.json(newTenant, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating tenant:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
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
