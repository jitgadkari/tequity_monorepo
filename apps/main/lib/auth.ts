import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
)

export interface JWTPayload {
  userId: string
  email: string
  tenantSlug: string
  role: string
  iat?: number
  exp?: number
}

/**
 * Create a JWT token for authenticated user
 */
export async function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token expires in 24 hours
    .sign(JWT_SECRET)

  return token
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return null
  }

  // Support "Bearer <token>" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return authHeader
}

/**
 * Verify auth from request and return user payload
 */
export async function verifyAuth(request: NextRequest): Promise<JWTPayload | null> {
  const token = extractTokenFromHeader(request)

  if (!token) {
    return null
  }

  return verifyToken(token)
}

/**
 * Verify auth and check tenant match
 */
export async function verifyAuthWithTenant(
  request: NextRequest,
  tenantSlug: string
): Promise<JWTPayload | null> {
  const payload = await verifyAuth(request)

  if (!payload) {
    return null
  }

  // Verify user belongs to this tenant
  if (payload.tenantSlug !== tenantSlug) {
    console.error(`Tenant mismatch: user belongs to ${payload.tenantSlug}, accessing ${tenantSlug}`)
    return null
  }

  return payload
}

/**
 * Check if user has required role
 */
export function hasRole(payload: JWTPayload, requiredRoles: string[]): boolean {
  return requiredRoles.includes(payload.role)
}

/**
 * Check if user is admin or owner
 */
export function isAdminOrOwner(payload: JWTPayload): boolean {
  return hasRole(payload, ['admin', 'owner'])
}
