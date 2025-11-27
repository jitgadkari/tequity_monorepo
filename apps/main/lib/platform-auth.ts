/**
 * Platform-wide authentication utilities
 * Handles signup, signin, and onboarding flows
 * Uses HTTP-only cookies for session management (no localStorage)
 */

export interface PlatformAuthResponse {
  success: boolean;
  message?: string;
  redirectUrl?: string;
  error?: string;
}

/**
 * Send signup OTP to email (creates new user in master DB)
 */
export async function platformSignup(email: string): Promise<PlatformAuthResponse> {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Send signin OTP to existing user
 */
export async function platformSignin(email: string): Promise<PlatformAuthResponse> {
  try {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Verify OTP and create session
 */
export async function platformVerifyOtp(
  email: string,
  otp: string,
  purpose: 'email_verification' | 'login_otp'
): Promise<PlatformAuthResponse> {
  try {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, purpose }),
      credentials: 'include', // Important: include cookies
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get current session (check if logged in)
 */
export async function getSessionUser(): Promise<{
  authenticated: boolean;
  user?: {
    userId: string;
    email: string;
    emailVerified: boolean;
    onboardingCompleted: boolean;
  };
}> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    });

    if (!response.ok) {
      return { authenticated: false };
    }

    const data = await response.json();
    return {
      authenticated: true,
      user: data.user,
    };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Platform logout - clears session cookie
 */
export async function platformLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    // Redirect to signin regardless of response
    if (typeof window !== 'undefined') {
      window.location.href = '/signin';
    }
  }
}

/**
 * Resend OTP code
 */
export async function resendOtp(
  email: string,
  purpose: 'email_verification' | 'login_otp'
): Promise<PlatformAuthResponse> {
  // For email_verification, call signup again
  // For login_otp, call signin again
  if (purpose === 'email_verification') {
    return platformSignup(email);
  } else {
    return platformSignin(email);
  }
}
