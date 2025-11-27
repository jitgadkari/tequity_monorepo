import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getMasterDb, schema } from '@/lib/master-db';
import { generateOtp, getOtpExpiryDate, formatOtpForConsole } from '@tequity/utils';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getMasterDb();

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 400 }
      );
    }

    // Create new user with unverified email
    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: normalizedEmail,
        emailVerified: false,
        onboardingCompleted: false,
      })
      .returning();

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = getOtpExpiryDate();

    // Store OTP
    await db.insert(schema.verificationTokens).values({
      userId: newUser.id,
      email: normalizedEmail,
      token: otp,
      purpose: 'email_verification',
      expiresAt,
    });

    // Log OTP to console (development)
    formatOtpForConsole(normalizedEmail, otp);

    // Create onboarding record
    await db.insert(schema.tenantOnboarding).values({
      userId: newUser.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
