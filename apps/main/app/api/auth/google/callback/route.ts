import { NextRequest, NextResponse } from 'next/server';
import { getMasterDb } from '@/lib/master-db';
import { setSession } from '@/lib/session';
import { createSessionToken } from '@tequity/utils';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // 'signin' or 'signup'
    const error = searchParams.get('error');

    const mode = state || 'signin';

    if (error) {
      console.error('[GOOGLE_CALLBACK] OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${mode}?error=oauth_cancelled`
      );
    }

    if (!code) {
      console.error('[GOOGLE_CALLBACK] No authorization code received');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${mode}?error=no_code`
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      console.error('[GOOGLE_CALLBACK] Missing Google OAuth credentials');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${mode}?error=configuration_error`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[GOOGLE_CALLBACK] Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${mode}?error=token_exchange_failed`
      );
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      console.error('[GOOGLE_CALLBACK] Failed to fetch user info');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${mode}?error=user_info_failed`
      );
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json();
    console.log('[GOOGLE_CALLBACK] User info received:', {
      email: userInfo.email,
      verified: userInfo.verified_email,
    });

    if (!userInfo.verified_email) {
      console.error('[GOOGLE_CALLBACK] Email not verified');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${mode}?error=email_not_verified`
      );
    }

    const db = getMasterDb();
    const normalizedEmail = userInfo.email.toLowerCase().trim();

    // Check if tenant exists
    let tenant = await db.tenant.findUnique({
      where: { email: normalizedEmail },
      include: {
        onboardingSession: true,
      },
    });

    if (mode === 'signup') {
      // Sign up flow
      if (tenant) {
        console.log('[GOOGLE_CALLBACK] Tenant already exists, redirecting to signin');
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/signin?error=account_exists`
        );
      }

      // Create new tenant
      tenant = await db.tenant.create({
        data: {
          email: normalizedEmail,
          emailVerified: true, // Google verified the email
          status: 'PENDING_ONBOARDING',
          fullName: userInfo.name,
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

      console.log('[GOOGLE_CALLBACK] Created new tenant via Google OAuth:', {
        id: tenant.id,
        email: tenant.email,
      });
    } else {
      // Sign in flow
      if (!tenant) {
        console.log('[GOOGLE_CALLBACK] No account found, redirecting to signup');
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/signup?error=no_account`
        );
      }

      // Update email verification if not already verified
      if (!tenant.emailVerified) {
        tenant = await db.tenant.update({
          where: { id: tenant.id },
          data: { emailVerified: true },
          include: {
            onboardingSession: true,
          },
        });
      }

      console.log('[GOOGLE_CALLBACK] Existing tenant signing in:', {
        id: tenant.id,
        email: tenant.email,
      });
    }

    // Create session with tenantSlug
    // Google OAuth users have verified emails by default
    await setSession({ 
      tenantId: tenant.id, 
      email: tenant.email,
      tenantSlug: tenant.slug,
      emailVerified: true // Google OAuth verifies emails
    });

    // Generate JWT for API calls
    const token = await createSessionToken({ 
      tenantId: tenant.id, 
      email: tenant.email,
      tenantSlug: tenant.slug,
      emailVerified: true 
    });

    // Determine redirect URL based on onboarding status
    let redirectUrl = '/workspaces';
    if (tenant.status === 'PENDING_ONBOARDING') {
      const stage = tenant.onboardingSession?.currentStage;
      if (stage === 'SIGNUP_STARTED' || stage === 'EMAIL_VERIFIED') {
        redirectUrl = '/workspace-setup';
      }
    }

    // Create response with redirect
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}${redirectUrl}?token=${token}&mode=${mode}`
    );

    return response;
  } catch (error) {
    console.error('[GOOGLE_CALLBACK] Error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/signin?error=server_error`
    );
  }
}
