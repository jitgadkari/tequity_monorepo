import { cookies } from 'next/headers';
import { createSessionToken, verifySessionToken } from '@tequity/utils';
import type { SessionPayload } from '@tequity/types';

const SESSION_COOKIE_NAME = 'tequity_session';

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  console.log(`[Session] Getting session - cookie present: ${!!sessionCookie?.value}, length: ${sessionCookie?.value?.length || 0}`);

  if (!sessionCookie?.value) {
    console.log('[Session] No session cookie found');
    return null;
  }

  try {
    const session = await verifySessionToken(sessionCookie.value);
    console.log('[Session] Session verified:', session ? {
      tenantId: session.tenantId,
      email: session.email,
      tenantSlug: session.tenantSlug,
      emailVerified: session.emailVerified,
    } : 'null (verification failed)');
    return session;
  } catch (error) {
    console.error('[Session] Failed to verify session token:', error);
    return null;
  }
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();

  // In production, secure cookies require HTTPS
  // Allow non-secure cookies in staging until SSL is provisioned
  const isProduction = process.env.NODE_ENV === 'production';
  const isStaging = process.env.NEXT_PUBLIC_APP_URL?.includes('staging');
  const useSecureCookies = isProduction && !isStaging;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function updateSession(updates: Partial<SessionPayload>): Promise<void> {
  const session = await getSession();
  if (!session) return;

  await setSession({
    ...session,
    ...updates,
  });
}
