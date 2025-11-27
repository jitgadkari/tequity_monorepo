import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions, customers } from '@/lib/db/schema';
import { like, or, and, asc, desc, sql, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

// GET /api/subscriptions - List all subscriptions with search and pagination
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const customerId = searchParams.get('customerId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'dueDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build search conditions
    const conditions = [];

    // Add customer filter if provided
    if (customerId) {
      conditions.push(eq(subscriptions.customerId, customerId));
    }

    // Add text search if provided
    if (search) {
      conditions.push(
        or(
          like(subscriptions.description, `%${search}%`)
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

    // Get subscriptions with customer info
    const orderColumn = sortBy === 'dueDate' ? subscriptions.dueDate : subscriptions.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    const result = await db
      .select({
        id: subscriptions.id,
        customerId: subscriptions.customerId,
        customerName: customers.name,
        amount: subscriptions.amount,
        dueDate: subscriptions.dueDate,
        paymentDate: subscriptions.paymentDate,
        description: subscriptions.description,
        status: subscriptions.status,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .leftJoin(customers, eq(subscriptions.customerId, customers.id))
      .where(whereClause)
      .orderBy(orderDirection)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      subscriptions: result,
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

// POST /api/subscriptions - Create a new subscription/payment entry
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    const body = await request.json();

    // Validate required fields
    const { customerId, amount, dueDate, description, status } = body;

    if (!customerId || !amount || !dueDate || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, amount, dueDate, description' },
        { status: 400 }
      );
    }

    // Insert new subscription
    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        customerId,
        amount: amount.toString(),
        dueDate: new Date(dueDate),
        paymentDate: status === 'paid' ? new Date() : null,
        description,
        status: status || 'upcoming',
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
