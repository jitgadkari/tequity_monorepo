import { NextResponse } from 'next/server';
import { getMasterDb } from '@/lib/master-db';
import { generateOtp, getOtpExpiryDate, formatOtpForConsole } from '@tequity/utils';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getMasterDb();

    // Check if tenant exists
    const tenant = await db.tenant.findUnique({
      where: { email: normalizedEmail },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'No account found with this email. Please sign up first.' },
        { status: 404 }
      );
    }

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = getOtpExpiryDate();

    // Store OTP
    await db.verificationToken.create({
      data: {
        tenantId: tenant.id,
        email: normalizedEmail,
        token: otp,
        purpose: 'LOGIN_OTP',
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
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    );
  }
}
