import { NextResponse } from 'next/server';
import { getMasterDb } from '@/lib/master-db';
import { generateOtp, getOtpExpiryDate, formatOtpForConsole } from '@tequity/utils';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    console.log('[SIGNUP] Request received for email:', email);

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getMasterDb();

    // Check if tenant already exists with this email
    const existingTenant = await db.tenant.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingTenant) {
      console.log('[SIGNUP] Tenant already exists:', existingTenant.id);
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 400 }
      );
    }

    // Create new tenant with unverified email
    const newTenant = await db.tenant.create({
      data: {
        email: normalizedEmail,
        emailVerified: false,
        status: 'PENDING_ONBOARDING',
        // Create onboarding session in the same transaction
        onboardingSession: {
          create: {
            currentStage: 'SIGNUP_STARTED',
          },
        },
      },
      include: {
        onboardingSession: true,
      },
    });

    console.log('[SIGNUP] Created new tenant:', {
      id: newTenant.id,
      email: newTenant.email,
      status: newTenant.status,
      onboardingStage: newTenant.onboardingSession?.currentStage,
    });

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = getOtpExpiryDate();

    // Store OTP for email verification
    const verificationToken = await db.verificationToken.create({
      data: {
        tenantId: newTenant.id,
        email: normalizedEmail,
        token: otp,
        purpose: 'EMAIL_VERIFICATION',
        expiresAt,
      },
    });

    console.log('[SIGNUP] Created verification token:', {
      id: verificationToken.id,
      tenantId: verificationToken.tenantId,
      purpose: verificationToken.purpose,
      expiresAt: verificationToken.expiresAt,
    });

    // Log OTP to console (development)
    formatOtpForConsole(normalizedEmail, otp);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('[SIGNUP] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
