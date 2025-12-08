/**
 * Email Service
 *
 * Handles sending emails using Nodemailer
 * Supports Gmail, Outlook, custom SMTP, and mock mode
 */

import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Create email transporter based on configuration
 */
function createTransporter() {
  const emailProvider = process.env.EMAIL_PROVIDER || 'mock';

  if (emailProvider === 'mock') {
    // Mock transporter for development
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  // Gmail configuration
  if (emailProvider === 'gmail') {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.warn('[EMAIL] Gmail credentials not configured, falling back to mock');
      return nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  // Outlook/Office365 configuration
  if (emailProvider === 'outlook') {
    const user = process.env.OUTLOOK_USER;
    const pass = process.env.OUTLOOK_PASSWORD;

    if (!user || !pass) {
      console.warn('[EMAIL] Outlook credentials not configured, falling back to mock');
      return nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }

    return nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      auth: {
        user,
        pass,
      },
    });
  }

  // Custom SMTP configuration
  if (emailProvider === 'smtp') {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host || !user || !pass) {
      console.warn('[EMAIL] SMTP credentials not configured, falling back to mock');
      return nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  // Default to mock
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
}

/**
 * Send an OTP verification email
 */
export async function sendOtpEmail(email: string, otp: string, purpose: 'signup' | 'signin'): Promise<void> {
  const subject = purpose === 'signup'
    ? 'Verify your email address'
    : 'Your sign-in verification code';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: 600;">Tequity</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 0 40px 40px;">
                    <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                      ${purpose === 'signup' ? 'Welcome to Tequity!' : 'Sign in to your account'}
                    </h2>

                    <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 24px;">
                      ${purpose === 'signup'
                        ? 'Thank you for signing up! To complete your registration, please verify your email address using the code below:'
                        : 'To sign in to your account, please use the verification code below:'}
                    </p>

                    <!-- OTP Code Box -->
                    <table role="presentation" style="width: 100%; margin: 30px 0;">
                      <tr>
                        <td align="center" style="background-color: #f7fafc; border: 2px dashed #cbd5e0; border-radius: 8px; padding: 30px;">
                          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2d3748; font-family: 'Courier New', monospace;">
                            ${otp}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 0; color: #718096; font-size: 14px; line-height: 20px;">
                      This code will expire in <strong>10 minutes</strong>. If you didn't request this code, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 40px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #a0aec0; font-size: 12px; line-height: 18px; text-align: center;">
                      This is an automated email from Tequity. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const text = `
Your ${purpose === 'signup' ? 'verification' : 'sign-in'} code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, you can safely ignore this email.

- Tequity Team
  `;

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Send an email using Nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = createTransporter();
  const emailProvider = process.env.EMAIL_PROVIDER || 'mock';

  // Determine the "from" address based on provider
  let fromAddress = 'noreply@tequity.com';

  if (emailProvider === 'gmail') {
    fromAddress = process.env.GMAIL_USER || fromAddress;
  } else if (emailProvider === 'outlook') {
    fromAddress = process.env.OUTLOOK_USER || fromAddress;
  } else if (emailProvider === 'smtp') {
    fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || fromAddress;
  }

  try {
    // ALWAYS log to console for debugging (both mock and real emails)
    console.log('========================================');
    console.log(`📧 ${emailProvider === 'mock' ? 'MOCK EMAIL (would be sent in production)' : 'SENDING EMAIL'}`);
    console.log('From:', fromAddress);
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('----------------------------------------');
    console.log(options.text || 'No text version');
    console.log('========================================');

    if (emailProvider === 'mock') {
      // Mock mode - only log to console
      return;
    }

    // Send real email
    const info = await transporter.sendMail({
      from: `"Tequity" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log('[EMAIL] ✅ Email sent successfully!', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
      provider: emailProvider,
    });
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);

    // Fallback to console logging if email fails
    console.log('========================================');
    console.log('📧 EMAIL SEND FAILED - Displaying content:');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('----------------------------------------');
    console.log(options.text || 'No text version');
    console.log('========================================');

    throw error;
  }
}
