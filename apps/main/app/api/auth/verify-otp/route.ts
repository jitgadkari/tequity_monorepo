import { NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { getMasterDb, schema } from '@/lib/master-db';
import { setSession } from '@/lib/session';
import { isOtpExpired, hasExceededAttempts } from '@tequity/utils';

export async function POST(request: Request) {
  try {
    const { email, otp, purpose } = await request.json();

    if (!email || !otp || !purpose) {
      return NextResponse.json(
        { error: 'Email, OTP, and purpose are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = getMasterDb();

    // Find the most recent token for this email and purpose
    const token = await db.query.verificationTokens.findFirst({
      where: and(
        eq(schema.verificationTokens.email, normalizedEmail),
        eq(schema.verificationTokens.purpose, purpose)
      ),
      orderBy: [desc(schema.verificationTokens.createdAt)],
    });

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
      await db
        .update(schema.verificationTokens)
        .set({ attempts: token.attempts + 1 })
        .where(eq(schema.verificationTokens.id, token.id));

      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }

    // Mark token as verified
    await db
      .update(schema.verificationTokens)
      .set({ verifiedAt: new Date() })
      .where(eq(schema.verificationTokens.id, token.id));

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normalizedEmail),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // For email verification, mark email as verified
    if (purpose === 'email_verification' && !user.emailVerified) {
      await db
        .update(schema.users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(schema.users.id, user.id));
    }

    // Create session
    await setSession({
      userId: user.id,
      email: user.email,
      emailVerified: purpose === 'email_verification' ? true : user.emailVerified,
      onboardingCompleted: user.onboardingCompleted,
    });

    // Determine redirect URL based on user state
    let redirectUrl = '/workspace-setup';

    if (!user.onboardingCompleted) {
      // Check onboarding progress
      const onboarding = await db.query.tenantOnboarding.findFirst({
        where: eq(schema.tenantOnboarding.userId, user.id),
      });

      if (!onboarding?.companyInfoCompleted || !onboarding?.useCaseCompleted) {
        redirectUrl = '/workspace-setup';
      } else if (!onboarding?.paymentCompleted) {
        redirectUrl = '/pricing';
      }
    } else {
      // Check if user has tenants
      const memberships = await db.query.tenantMemberships.findMany({
        where: eq(schema.tenantMemberships.userId, user.id),
      });

      if (memberships.length > 0) {
        // Get the first tenant slug (prioritize active ones)
        const tenants = await Promise.all(
          memberships.map(async (m) => {
            return db.query.tenants.findFirst({
              where: eq(schema.tenants.id, m.tenantId),
            });
          })
        );

        const activeTenant = tenants.find((t) => t?.status === 'active');
        const anyTenant = tenants.find((t) => t);

        if (activeTenant) {
          redirectUrl = `/${activeTenant.slug}/Dashboard/Library`;
        } else if (anyTenant) {
          // Tenant is still provisioning, go to a waiting page or dashboard
          redirectUrl = `/${anyTenant.slug}/Dashboard/Library`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code. Please try again.' },
      { status: 500 }
    );
  }
}
