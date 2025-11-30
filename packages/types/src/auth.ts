// Session payload stored in JWT
// Note: The "tenant" is the person who signed up. After their DB is provisioned,
// they become a "user" with owner role in the tenant DB.
export interface SessionPayload {
  tenantId: string; // ID of the tenant (the person who signed up)
  email: string;
  emailVerified: boolean;
  tenantSlug?: string | null; // Set after dataroom is named (workspace URL)
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
  tenant: {
    id: string;
    email: string;
    fullName: string | null;
    emailVerified: boolean;
    workspaceName: string | null;
    slug: string | null;
    status: string;
  };
  onboardingStage: string;
}
