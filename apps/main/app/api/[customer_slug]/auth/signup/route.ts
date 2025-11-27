import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug, getOrCreateTenant } from '@/lib/db'
import { createOTP } from '@/lib/otp'
import { successResponse, errorResponse, ApiErrors } from '@/lib/api-response'

/**
 * POST /api/[customer_slug]/auth/signup
 * Send OTP to email for new user signup
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customer_slug: string }> }
) {
  try {
    const { customer_slug: tenantSlug } = await params

    // Validate tenant slug format
    if (!isValidTenantSlug(tenantSlug)) {
      return ApiErrors.invalidTenant()
    }

    // Parse request body
    const body = await request.json()
    const { email, name } = body

    if (!email || typeof email !== 'string') {
      return ApiErrors.validationError('Email is required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return ApiErrors.validationError('Invalid email format')
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Get or create tenant (auto-creates on first signup)
    await getOrCreateTenant(tenantSlug, name || tenantSlug)

    // Check if user already exists in this tenant
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantSlug_email: {
          tenantSlug,
          email: normalizedEmail,
        },
      },
    })

    if (existingUser) {
      return errorResponse('An account with this email already exists. Please login instead.', 409, 'USER_EXISTS')
    }

    // Create and send OTP
    const { expiresAt } = await createOTP(tenantSlug, normalizedEmail, 'signup')

    return successResponse({
      message: 'Verification code sent to your email',
      email: normalizedEmail,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Signup error:', error)
    return ApiErrors.internalError()
  }
}
