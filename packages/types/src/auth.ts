// Session payload stored in JWT
export interface SessionPayload {
  userId: string;
  email: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  tenantSlug?: string; // Set after checkout/payment
}

// Auth API request/response types
export interface SignupRequest {
  email: string;
}

export interface SigninRequest {
  email: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
  purpose: 'email_verification' | 'login_otp';
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  redirectUrl?: string;
}

export interface MeResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    emailVerified: boolean;
    onboardingCompleted: boolean;
  };
  memberships: {
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    role: 'owner' | 'admin' | 'member';
    tenantStatus: string;
  }[];
}
