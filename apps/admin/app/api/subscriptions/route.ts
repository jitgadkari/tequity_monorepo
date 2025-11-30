import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { Prisma } from '@tequity/database';

// GET /api/subscriptions - List all subscriptions with search and pagination
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const tenantId = searchParams.get('tenantId') || searchParams.get('customerId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build search conditions using Prisma's SubscriptionWhereInput type
    const whereConditions: Prisma.SubscriptionWhereInput = {};

    if (tenantId) {
      whereConditions.tenantId = tenantId;
    }

    if (search) {
      whereConditions.plan = { contains: search, mode: 'insensitive' };
    }

    // Get total count
    const totalCount = await db.subscription.count({
      where: whereConditions,
    });

    const totalPages = Math.ceil(totalCount / limit);

    // Get subscriptions with tenant info
    const subscriptions = await db.subscription.findMany({
      where: whereConditions,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
      include: {
        tenant: {
          select: {
            workspaceName: true,
            slug: true,
          },
        },
      },
    });

    // Transform for frontend compatibility
    const transformedSubscriptions = subscriptions.map((sub) => ({
      id: sub.id,
      customerId: sub.tenantId,
      customerName: sub.tenant?.workspaceName,
      customerSlug: sub.tenant?.slug,
      plan: sub.plan,
      billing: sub.billing,
      status: sub.status,
      amount: getPlanAmount(sub.plan, sub.billing),
      dueDate: sub.currentPeriodEnd,
      paymentDate: sub.currentPeriodStart,
      description: `${sub.plan} plan - ${sub.billing}`,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      trialEndsAt: sub.trialEndsAt,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    }));

    return NextResponse.json({
      subscriptions: transformedSubscriptions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching subscriptions:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

// Helper to get plan amount (placeholder - should come from pricing config)
function getPlanAmount(plan: string, billing: string): string {
  const prices: Record<string, Record<string, number>> = {
    starter: { monthly: 0, yearly: 0 },
    professional: { monthly: 49, yearly: 490 },
    enterprise: { monthly: 99, yearly: 990 },
  };
  const amount = prices[plan]?.[billing] || 0;
  return `$${amount}`;
}

// POST /api/subscriptions - Create a new subscription
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { tenantId, plan, billing, status } = body;

    if (!tenantId || !plan || !billing) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, plan, billing' },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if subscription already exists for this tenant
    const existingSubscription = await db.subscription.findUnique({
      where: { tenantId },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Subscription already exists for this tenant' },
        { status: 400 }
      );
    }

    // Create subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (billing === 'yearly' ? 12 : 1));

    const newSubscription = await db.subscription.create({
      data: {
        tenantId,
        plan,
        billing,
        status: status || 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating subscription:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
