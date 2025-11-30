import { NextResponse } from 'next/server';
import { getMasterDb } from '@/lib/master-db';
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

    // Find tenant
    const tenant = await db.tenant.findUnique({
      where: { email: normalizedEmail },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      );
    }

    // Check for recent OTP to prevent spam
    const recentToken = await db.verificationToken.findFirst({
      where: {
        email: normalizedEmail,
        purpose: purpose.toUpperCase(),
      },
      orderBy: {
        createdAt: 'desc',
      },
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
    await db.verificationToken.create({
      data: {
        tenantId: tenant.id,
        email: normalizedEmail,
        token: otp,
        purpose: purpose.toUpperCase(),
        expiresAt,
      },
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
