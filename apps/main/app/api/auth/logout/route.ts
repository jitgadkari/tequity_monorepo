import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

// GET handler for redirect-based logout (used when session is invalid)
export async function GET(request: Request) {
  try {
    await clearSession();
    const url = new URL('/signin', request.url);
    url.searchParams.set('error', 'session_expired');
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Logout error:', error);
    // Still redirect even if clear fails
    return NextResponse.redirect(new URL('/signin', request.url));
  }
}
