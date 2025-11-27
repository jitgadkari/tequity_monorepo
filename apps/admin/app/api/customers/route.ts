import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { like, or, asc, desc, sql, eq } from 'drizzle-orm';
import { requireAdmin, validateServiceApiKey } from '@/lib/auth';
import crypto from 'crypto';
import { generateSlug, makeSlugUnique } from '@/lib/utils/slug';

// GET /api/customers - List all customers with search and pagination
// Supports service-to-service authentication for slug-based lookups
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
        .from(customers)
        .where(eq(customers.slug, slug))
        .limit(1);

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: result[0] });
    }

    // Admin authentication required for listing customers
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
          like(customers.name, `%${search}%`),
          like(customers.email, `%${search}%`),
          like(customers.plan, `%${search}%`)
        )
      : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(searchConditions);

    const totalCount = Number(countResult.count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get customers with pagination
    const orderColumn = sortBy === 'lastActive' ? customers.lastActive : customers.createdAt;
    const orderDirection = sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

    const result = await db
      .select()
      .from(customers)
      .where(searchConditions)
      .orderBy(orderDirection)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      customers: result,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();
    const body = await request.json();

    // Validate required fields
    const { name, email, plan, ownerEmail, dbUrl } = body;

    if (!name || !email || !plan || !ownerEmail || !dbUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, plan, ownerEmail, dbUrl' },
        { status: 400 }
      );
    }

    // Generate logo from first letter of company name
    const logo = name.charAt(0).toUpperCase();

    // Generate random color for logo
    const colors = ['#FF5722', '#2196F3', '#9C27B0', '#795548', '#607D8B', '#FF9800', '#424242'];
    const logoColor = colors[Math.floor(Math.random() * colors.length)];

    // Generate unique setup token
    const setupToken = crypto.randomBytes(32).toString('hex');

    // Generate slug from company name
    const baseSlug = generateSlug(name);

    // Check for existing slugs to ensure uniqueness
    const existingCustomers = await db
      .select({ slug: customers.slug })
      .from(customers)
      .where(like(customers.slug, `${baseSlug}%`));

    const existingSlugs = existingCustomers.map(c => c.slug);
    const uniqueSlug = makeSlugUnique(baseSlug, existingSlugs);

    // Insert new customer
    const [newCustomer] = await db
      .insert(customers)
      .values({
        name,
        email,
        plan,
        ownerEmail,
        dbUrl,
        slug: uniqueSlug,
        setupToken,
        logo,
        logoColor,
        status: 'pending',
        lastActive: new Date(),
      })
      .returning();

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
