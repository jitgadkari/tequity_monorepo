import { NextResponse } from 'next/server';
import { getMasterDb } from '@/lib/master-db';
import { setSession } from '@/lib/session';
import { createToken } from '@/lib/auth';
import { isOtpExpired, hasExceededAttempts } from '@tequity/utils';
import { getRedirectForStage } from '@/lib/onboarding-router';

export async function POST(request: Request) {
  try {
    const { email, otp, purpose } = await request.json();
    console.log('[VERIFY-OTP] Request received:', { email, purpose });

    if (!email || !otp || !purpose) {
      return NextResponse.json(
        { error: 'Email, OTP, and purpose are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getMasterDb();

    // Find the most recent token for this email and purpose
    const token = await db.verificationToken.findFirst({
      where: {
        email: normalizedEmail,
        purpose: purpose === 'email_verification' ? 'EMAIL_VERIFICATION' : 'LOGIN_OTP',
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('[VERIFY-OTP] Found token:', token ? { id: token.id, purpose: token.purpose } : null);

    if (!token) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (token.verifiedAt) {
      return NextResponse.json(
        { error: 'This code has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if expired
    if (isOtpExpired(token.expiresAt)) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check attempts
    if (hasExceededAttempts(token.attempts)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (token.token !== otp) {
      // Increment attempts
      await db.verificationToken.update({
        where: { id: token.id },
        data: { attempts: token.attempts + 1 },
      });

      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }

    // Mark token as verified
    await db.verificationToken.update({
      where: { id: token.id },
      data: { verifiedAt: new Date() },
    });

    console.log('[VERIFY-OTP] Token verified successfully');

    // Get tenant with onboarding session
    const tenant = await db.tenant.findUnique({
      where: { email: normalizedEmail },
      include: { onboardingSession: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.log('[VERIFY-OTP] Found tenant:', {
      id: tenant.id,
      email: tenant.email,
      emailVerified: tenant.emailVerified,
      status: tenant.status,
      onboardingStage: tenant.onboardingSession?.currentStage,
    });

    // For email verification, mark email as verified and update stage
    if (purpose === 'email_verification' && !tenant.emailVerified) {
      const updatedTenant = await db.tenant.update({
        where: { id: tenant.id },
        data: { emailVerified: true },
      });

      console.log('[VERIFY-OTP] Updated tenant emailVerified:', updatedTenant.emailVerified);

      // Update onboarding stage to EMAIL_VERIFIED
      if (tenant.onboardingSession) {
        const updatedSession = await db.onboardingSession.update({
          where: { id: tenant.onboardingSession.id },
          data: {
            currentStage: 'EMAIL_VERIFIED',
            emailVerifiedAt: new Date(),
          },
        });

        console.log('[VERIFY-OTP] Updated onboarding stage:', updatedSession.currentStage);
      }
    }

    // Create session with tenant info (for SSR pages)
    await setSession({
      tenantId: tenant.id,
      email: tenant.email,
      emailVerified: purpose === 'email_verification' ? true : tenant.emailVerified,
      tenantSlug: tenant.slug,
    });

    console.log('[VERIFY-OTP] Session created for tenant:', tenant.id);

    // Determine redirect URL based on onboarding stage
    const currentStage = tenant.onboardingSession?.currentStage || 'EMAIL_VERIFIED';
    // If email was just verified, move to next stage
    const effectiveStage = purpose === 'email_verification' ? 'EMAIL_VERIFIED' : currentStage;
    const redirectUrl = getRedirectForStage(effectiveStage, tenant.slug || undefined);

    console.log('[VERIFY-OTP] Redirect URL:', redirectUrl, 'Stage:', effectiveStage);

    // For active tenants, create JWT token for API authentication
    let authToken: string | null = null;
    let user: { id: string; email: string; fullName: string | null; role: string; tenantSlug: string } | null = null;

    if (tenant.status === 'ACTIVE' && tenant.slug) {
      try {
        // Get user from tenant database
        const { getTenantDb } = await import('@/lib/db');
        const tenantDb = await getTenantDb(tenant.slug);

        const tenantUser = await tenantDb.user.findFirst({
          where: {
            email: normalizedEmail,
            tenantSlug: tenant.slug,
          },
        });

        if (tenantUser) {
          // Create JWT token for API calls
          authToken = await createToken({
            userId: tenantUser.id,
            email: tenantUser.email,
            tenantSlug: tenant.slug,
            role: tenantUser.role,
          });

          user = {
            id: tenantUser.id,
            email: tenantUser.email,
            fullName: tenantUser.fullName,
            role: tenantUser.role,
            tenantSlug: tenant.slug,
          };

          console.log('[VERIFY-OTP] Created JWT token for user:', tenantUser.id);
        }
      } catch (err) {
        console.error('[VERIFY-OTP] Error fetching tenant user:', err);
        // Continue without token - user may not be provisioned yet
      }
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
      // Include token and user for frontend localStorage storage
      ...(authToken && { token: authToken }),
      ...(user && { user }),
    });
  } catch (error) {
    console.error('[VERIFY-OTP] Error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code. Please try again.' },
      { status: 500 }
    );
  }
}
