import { randomInt } from 'crypto';

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;

export function generateOtp(): string {
  // Generate a 6-digit OTP
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return randomInt(min, max + 1).toString();
}

export function getOtpExpiryDate(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
}

export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function hasExceededAttempts(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}

export function formatOtpForConsole(email: string, otp: string): void {
  console.log('\n========================================');
  console.log('OTP CODE (Development Mode)');
  console.log('========================================');
  console.log(`Email: ${email}`);
  console.log(`OTP: ${otp}`);
  console.log(`Expires in: ${OTP_EXPIRY_MINUTES} minutes`);
  console.log('========================================\n');
}

// Email template for OTP (for future email integration)
export function getOtpEmailContent(otp: string, purpose: string): { subject: string; body: string } {
  const purposeText = purpose === 'login_otp' ? 'sign in' : 'verify your email';

  return {
    subject: `Your verification code: ${otp}`,
    body: `
      <h2>Your verification code</h2>
      <p>Use this code to ${purposeText}:</p>
      <h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace;">${otp}</h1>
      <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    `,
  };
}
