import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { SessionPayload } from '@tequity/types';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getJwtSecret();

  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function decodeToken(token: string): Promise<SessionPayload | null> {
  try {
    // Decode without verification (for debugging)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
