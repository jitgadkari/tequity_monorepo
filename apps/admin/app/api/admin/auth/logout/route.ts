import { NextRequest, NextResponse } from 'next/server';
import { clearAdminToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Clear the admin token cookie
    await clearAdminToken();

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
