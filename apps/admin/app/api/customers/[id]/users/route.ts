import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { like, or, eq, asc, desc, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

// GET /api/customers/[id]/users - List all users for a customer with search and pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    await requireAdmin();
    const { id: customerId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build search conditions - must belong to customer
    const conditions = [eq(users.customerId, customerId)];

    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.role, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${sql.join(conditions, sql` AND `)}`);

    const totalCount = Number(countResult.count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get users with pagination
    const orderColumn = sortBy === 'lastActive' ? users.lastActive : users.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    const result = await db
      .select()
      .from(users)
      .where(sql`${sql.join(conditions, sql` AND `)}`)
      .orderBy(orderDirection)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      users: result,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/customers/[id]/users - Create a new user for a customer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    await requireAdmin();
    const { id: customerId } = await params;
    const body = await request.json();

    // Validate required fields
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, role' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'general'].includes(role.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or general' },
        { status: 400 }
      );
    }

    // Generate avatar from name initials
    const nameParts = name.split(' ');
    const avatar = nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();

    // Insert new user
    const [newUser] = await db
      .insert(users)
      .values({
        customerId,
        name,
        email,
        role: role.toLowerCase(),
        avatar,
        status: 'pending',
        lastActive: new Date(),
      })
      .returning();

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
