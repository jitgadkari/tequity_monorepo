import { NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getMasterDb, schema } from '@/lib/master-db';
import { generateOtp, getOtpExpiryDate, formatOtpForConsole } from '@tequity/utils';

export async function POST(request: Request) {
  try {
    const { email, purpose } = await request.json();

    if (!email || !purpose) {
      return NextResponse.json(
        { error: 'Email and purpose are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getMasterDb();

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      );
    }

    // Check for recent OTP to prevent spam
    const recentToken = await db.query.verificationTokens.findFirst({
      where: and(
        eq(schema.verificationTokens.email, normalizedEmail),
        eq(schema.verificationTokens.purpose, purpose)
      ),
      orderBy: [desc(schema.verificationTokens.createdAt)],
    });

    if (recentToken) {
      const timeSinceCreation = Date.now() - new Date(recentToken.createdAt).getTime();
      const minWaitTime = 30 * 1000; // 30 seconds

      if (timeSinceCreation < minWaitTime) {
        const waitSeconds = Math.ceil((minWaitTime - timeSinceCreation) / 1000);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new code` },
          { status: 429 }
        );
      }
    }

    // Generate new OTP
    const otp = generateOtp();
    const expiresAt = getOtpExpiryDate();

    // Store new OTP
    await db.insert(schema.verificationTokens).values({
      userId: user.id,
      email: normalizedEmail,
      token: otp,
      purpose,
      expiresAt,
    });

    // Log OTP to console (development)
    formatOtpForConsole(normalizedEmail, otp);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}
