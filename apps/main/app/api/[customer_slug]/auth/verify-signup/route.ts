import { NextRequest } from 'next/server'
import prisma, { isValidTenantSlug } from '@/lib/db'
import { verifyOTP } from '@/lib/otp'
import { createToken } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'

/**
 * POST /api/[customer_slug]/auth/verify-signup
 * Verify OTP and create new user account
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
    const { email, code, fullName } = body

    if (!email || typeof email !== 'string') {
      return ApiErrors.validationError('Email is required')
    }

    if (!code || typeof code !== 'string') {
      return ApiErrors.validationError('Verification code is required')
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify OTP
    const otpResult = await verifyOTP(tenantSlug, normalizedEmail, code, 'signup')

    if (!otpResult.valid) {
      return ApiErrors.validationError(otpResult.error || 'Invalid verification code')
    }

    // Check if user already exists (race condition check)
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantSlug_email: {
          tenantSlug,
          email: normalizedEmail,
        },
      },
    })

    if (existingUser) {
      return ApiErrors.conflict('Account already exists')
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        tenantSlug,
        email: normalizedEmail,
        fullName: fullName || null,
        emailVerified: true,
        role: 'member',
        isActive: true,
      },
    })

    // Create default user settings
    await prisma.userSettings.create({
      data: {
        userId: user.id,
      },
    })

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      tenantSlug: user.tenantSlug,
      role: user.role,
    })

    return successResponse({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantSlug: user.tenantSlug,
      },
    }, 201)
  } catch (error) {
    console.error('Verify signup error:', error)
    return ApiErrors.internalError()
  }
}
