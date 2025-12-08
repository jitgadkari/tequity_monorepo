import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'signin'; // 'signin' or 'signup'

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

    if (!clientId) {
      console.error('[GOOGLE_AUTH] Missing GOOGLE_CLIENT_ID');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/${mode}?error=configuration_error`
      );
    }

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: mode, // Pass mode (signin/signup) in state parameter
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error('[GOOGLE_AUTH] Error initiating OAuth:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/signin?error=oauth_error`
    );
  }
}
