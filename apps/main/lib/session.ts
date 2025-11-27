import { cookies } from 'next/headers';
import { createSessionToken, verifySessionToken } from '@tequity/utils';
import type { SessionPayload } from '@tequity/types';

const SESSION_COOKIE_NAME = 'tequity_session';

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  return verifySessionToken(sessionCookie.value);
}

export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
