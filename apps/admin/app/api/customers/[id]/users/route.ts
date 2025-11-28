import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { like, or, eq, asc, desc, sql, and } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

const { users, tenantMemberships } = schema;

// GET /api/customers/[id]/users - List all users for a tenant via memberships
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: tenantId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build base query with join
    const baseQuery = db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        role: tenantMemberships.role,
        joinedAt: tenantMemberships.joinedAt,
      })
      .from(tenantMemberships)
      .innerJoin(users, eq(tenantMemberships.userId, users.id))
      .where(eq(tenantMemberships.tenantId, tenantId));

    // Get total count
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(tenantMemberships)
      .innerJoin(users, eq(tenantMemberships.userId, users.id))
      .where(eq(tenantMemberships.tenantId, tenantId));

    const [countResult] = await countQuery;
    const totalCount = Number(countResult.count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get users with pagination
    const orderDirection = sortOrder === 'asc' ? asc(users.createdAt) : desc(users.createdAt);

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        emailVerified: users.emailVerified,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        role: tenantMemberships.role,
        joinedAt: tenantMemberships.joinedAt,
      })
      .from(tenantMemberships)
      .innerJoin(users, eq(tenantMemberships.userId, users.id))
      .where(eq(tenantMemberships.tenantId, tenantId))
      .orderBy(orderDirection)
      .limit(limit)
      .offset(offset);

    // Transform to match frontend expectations
    const transformedUsers = result.map((user) => ({
      id: user.id,
      name: user.fullName || user.email.split('@')[0],
      email: user.email,
      role: user.role || 'member',
      status: user.emailVerified ? 'active' : 'pending',
      avatar: user.fullName
        ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user.email.substring(0, 2).toUpperCase(),
      lastActive: user.updatedAt,
      createdAt: user.createdAt,
      joinedAt: user.joinedAt,
    }));

    return NextResponse.json({
      users: transformedUsers,
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

// POST /api/customers/[id]/users - Create a new user and add to tenant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: tenantId } = await params;
    const body = await request.json();

    const { name, email, role } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400 }
      );
    }

    // Check if user already exists
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      // Check if already a member
      const [existingMembership] = await db
        .select()
        .from(tenantMemberships)
        .where(and(
          eq(tenantMemberships.userId, userId),
          eq(tenantMemberships.tenantId, tenantId)
        ))
        .limit(1);

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this tenant' },
          { status: 400 }
        );
      }
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          fullName: name || null,
          emailVerified: false,
          onboardingCompleted: false,
        })
        .returning();
      userId = newUser.id;
    }

    // Create membership
    const membershipRole = role === 'admin' ? 'admin' : role === 'owner' ? 'owner' : 'member';

    const [newMembership] = await db
      .insert(tenantMemberships)
      .values({
        userId,
        tenantId,
        role: membershipRole,
        invitedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      userId,
      membershipId: newMembership.id,
      message: 'User added to tenant'
    }, { status: 201 });
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
