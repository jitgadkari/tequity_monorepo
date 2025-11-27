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

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email. Please sign up first.' },
        { status: 404 }
      );
    }

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = getOtpExpiryDate();

    // Store OTP
    await db.insert(schema.verificationTokens).values({
      userId: user.id,
      email: normalizedEmail,
      token: otp,
      purpose: 'login_otp',
      expiresAt,
    });

    // Log OTP to console (development)
    formatOtpForConsole(normalizedEmail, otp);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}
