import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { like, or, and, asc, desc, sql, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

const { subscriptions, tenants } = schema;

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

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];

    if (tenantId) {
      conditions.push(eq(subscriptions.tenantId, tenantId));
    }

    if (search) {
      conditions.push(
        or(
          like(subscriptions.plan, `%${search}%`),
          like(subscriptions.status, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(whereClause);

    const totalCount = Number(countResult.count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get subscriptions with tenant info
    const orderDirection = sortOrder === 'asc' ? asc(subscriptions.createdAt) : desc(subscriptions.createdAt);

    const result = await db
      .select({
        id: subscriptions.id,
        tenantId: subscriptions.tenantId,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        stripeCustomerId: subscriptions.stripeCustomerId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripePriceId: subscriptions.stripePriceId,
        plan: subscriptions.plan,
        billing: subscriptions.billing,
        status: subscriptions.status,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .leftJoin(tenants, eq(subscriptions.tenantId, tenants.id))
      .where(whereClause)
      .orderBy(orderDirection)
      .limit(limit)
      .offset(offset);

    // Transform for frontend compatibility
    const transformedSubscriptions = result.map((sub) => ({
      id: sub.id,
      customerId: sub.tenantId,
      customerName: sub.tenantName,
      customerSlug: sub.tenantSlug,
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
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    if (error.message === 'Unauthorized') {
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
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if subscription already exists for this tenant
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);

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

    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        tenantId,
        plan,
        billing,
        status: status || 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      })
      .returning();

    return NextResponse.json(newSubscription, { status: 201 });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    if (error.message === 'Unauthorized') {
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
