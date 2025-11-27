import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/setup/validate?token=xxx - Validate setup token and return customer info
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Setup token is required' },
        { status: 400 }
      );
    }

    // Find customer by setup token
    const [customer] = await db
      .select({
        id: customers.id,
        name: customers.name,
        slug: customers.slug,
        email: customers.email,
        plan: customers.plan,
        ownerEmail: customers.ownerEmail,
        dbUrl: customers.dbUrl,
        status: customers.status,
        setupCompleted: customers.setupCompleted,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(eq(customers.setupToken, token))
      .limit(1);

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid or expired setup token' },
        { status: 404 }
      );
    }

    // Return customer info (dbUrl included for customer app to use)
    return NextResponse.json({
      customer,
      message: 'Setup token is valid',
    });
  } catch (error: any) {
    console.error('Error validating setup token:', error);
    return NextResponse.json(
      { error: 'Failed to validate setup token' },
      { status: 500 }
    );
  }
}

// POST /api/setup/validate - Mark setup as completed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Setup token is required' },
        { status: 400 }
      );
    }

    // Mark setup as completed
    const [updatedCustomer] = await db
      .update(customers)
      .set({
        setupCompleted: new Date(),
        status: 'active', // Activate customer after setup completion
        updatedAt: new Date(),
      })
      .where(eq(customers.setupToken, token))
      .returning();

    if (!updatedCustomer) {
      return NextResponse.json(
        { error: 'Invalid setup token' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Setup completed successfully',
      customer: updatedCustomer,
    });
  } catch (error: any) {
    console.error('Error completing setup:', error);
    return NextResponse.json(
      { error: 'Failed to complete setup' },
      { status: 500 }
    );
  }
}
