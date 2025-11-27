import prisma from './db'

const OTP_EXPIRY_MINUTES = 10
const MAX_OTP_ATTEMPTS = 3

/**
 * Generate a 6-digit OTP code
 */
export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Create and store an OTP for email verification
 * Prints to console for now (mock email sending)
 */
export async function createOTP(
  tenantSlug: string,
  email: string,
  purpose: 'login' | 'signup' | 'password_reset'
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateOTPCode()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  // Delete any existing OTPs for this email/purpose
  await prisma.otpVerification.deleteMany({
    where: {
      tenantSlug,
      email,
      purpose,
    },
  })

  // Create new OTP
  await prisma.otpVerification.create({
    data: {
      tenantSlug,
      email,
      code,
      purpose,
      expiresAt,
      attempts: 0,
    },
  })

  // MOCK: Print OTP to console instead of sending email
  console.log('========================================')
  console.log(`📧 OTP for ${email} (${purpose}):`)
  console.log(`   Code: ${code}`)
  console.log(`   Expires: ${expiresAt.toISOString()}`)
  console.log(`   Tenant: ${tenantSlug}`)
  console.log('========================================')

  return { code, expiresAt }
}

/**
 * Verify an OTP code
 */
export async function verifyOTP(
  tenantSlug: string,
  email: string,
  code: string,
  purpose: 'login' | 'signup' | 'password_reset'
): Promise<{ valid: boolean; error?: string }> {
  const otp = await prisma.otpVerification.findFirst({
    where: {
      tenantSlug,
      email,
      purpose,
      verifiedAt: null, // Not already verified
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!otp) {
    return { valid: false, error: 'No OTP found. Please request a new code.' }
  }

  // Check if expired
  if (new Date() > otp.expiresAt) {
    return { valid: false, error: 'OTP has expired. Please request a new code.' }
  }

  // Check attempts
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    return { valid: false, error: 'Too many attempts. Please request a new code.' }
  }

  // Increment attempts
  await prisma.otpVerification.update({
    where: { id: otp.id },
    data: { attempts: otp.attempts + 1 },
  })

  // Check code
  if (otp.code !== code) {
    return { valid: false, error: 'Invalid code. Please try again.' }
  }

  // Mark as verified
  await prisma.otpVerification.update({
    where: { id: otp.id },
    data: { verifiedAt: new Date() },
  })

  return { valid: true }
}

/**
 * Check if an email has a pending (unverified) OTP
 */
export async function hasPendingOTP(
  tenantSlug: string,
  email: string,
  purpose: 'login' | 'signup' | 'password_reset'
): Promise<boolean> {
  const otp = await prisma.otpVerification.findFirst({
    where: {
      tenantSlug,
      email,
      purpose,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  return !!otp
}

/**
 * Clean up expired OTPs (can be called periodically)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  const result = await prisma.otpVerification.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })

  return result.count
}
