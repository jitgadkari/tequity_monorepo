import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { platformAdmins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { comparePassword, createToken, setAdminToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find admin by email
    const [admin] = await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, email))
      .limit(1);

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (admin.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await db
      .update(platformAdmins)
      .set({ lastLogin: new Date() })
      .where(eq(platformAdmins.id, admin.id));

    // Create JWT token
    const token = await createToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    // Set cookie
    await setAdminToken(token);

    // Return admin info (without password)
    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
