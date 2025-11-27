import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { createOTP } from '@/lib/otp'
import { successResponse, errorResponse, ApiErrors } from '@/lib/api-response'

/**
 * POST /api/[customer_slug]/auth/send-code
 * Send OTP for existing user login
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
    const { email } = body

    if (!email || typeof email !== 'string') {
      return ApiErrors.validationError('Email is required')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return ApiErrors.validationError('Invalid email format')
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists in this tenant
    const user = await prisma.user.findUnique({
      where: {
        tenantSlug_email: {
          tenantSlug,
          email: normalizedEmail,
        },
      },
    })

    if (!user) {
      return errorResponse('No account found with this email. Please sign up first.', 404, 'USER_NOT_FOUND')
    }

    if (!user.isActive) {
      return errorResponse('This account has been deactivated.', 403, 'ACCOUNT_INACTIVE')
    }

    // Create and send OTP
    const { expiresAt } = await createOTP(tenantSlug, normalizedEmail, 'login')

    return successResponse({
      message: 'Verification code sent to your email',
      email: normalizedEmail,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Send code error:', error)
    return ApiErrors.internalError()
  }
}
