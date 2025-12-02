import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface AdminJWTPayload {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
}

// Create JWT token
export async function createToken(payload: AdminJWTPayload): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days
    .sign(secret);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<AdminJWTPayload | null> {
  try {
    const verified = await jwtVerify(token, secret);
    return verified.payload as unknown as AdminJWTPayload;
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Compare password
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Get current admin from cookies
export async function getCurrentAdmin(): Promise<AdminJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin-token')?.value;

  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

// Set admin token cookie
export async function setAdminToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('admin-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear admin token
export async function clearAdminToken() {
  const cookieStore = await cookies();
  cookieStore.delete('admin-token');
}

// API Route Authentication Helper
// Use this in API routes to verify admin authentication
export async function requireAdmin(): Promise<AdminJWTPayload> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    throw new Error('Unauthorized');
  }

  return admin;
}

// Service-to-Service Authentication
// Validates the service API key from request headers
export function validateServiceApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-service-api-key');
  const validKey = process.env.SERVICE_API_KEY;

  console.log('[Auth] Validating service API key...');
  console.log('[Auth] Received API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NONE');
  console.log('[Auth] Expected API key:', validKey ? `${validKey.substring(0, 10)}...` : 'NOT SET');

  if (!validKey) {
    console.warn('⚠️  SERVICE_API_KEY not configured in environment');
    return false;
  }

  if (!apiKey) {
    console.warn('⚠️  No API key provided in x-service-api-key header');
    return false;
  }

  const isValid = apiKey === validKey;
  console.log('[Auth] API key validation:', isValid ? '✅ VALID' : '❌ INVALID');

  return isValid;
}
