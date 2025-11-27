import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyOTP } from '@/lib/otp'
import { createToken } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * POST /api/[customer_slug]/auth/verify-code
 * Verify OTP and login user
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
    const { email, code } = body

    if (!email || typeof email !== 'string') {
      return ApiErrors.validationError('Email is required')
    }

    if (!code || typeof code !== 'string') {
      return ApiErrors.validationError('Verification code is required')
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify OTP
    const otpResult = await verifyOTP(tenantSlug, normalizedEmail, code, 'login')

    if (!otpResult.valid) {
      return ApiErrors.validationError(otpResult.error || 'Invalid verification code')
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: {
        tenantSlug_email: {
          tenantSlug,
          email: normalizedEmail,
        },
      },
    })

    if (!user) {
      return ApiErrors.notFound('User')
    }

    if (!user.isActive) {
      return ApiErrors.forbidden()
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      tenantSlug: user.tenantSlug,
      role: user.role,
    })

    return successResponse({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantSlug: user.tenantSlug,
        avatarUrl: user.avatarUrl,
      },
    })
  } catch (error) {
    console.error('Verify code error:', error)
    return ApiErrors.internalError()
  }
}
