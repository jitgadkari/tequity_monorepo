import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { useCases } = await request.json();

    if (!useCases || !Array.isArray(useCases) || useCases.length === 0) {
      return NextResponse.json(
        { error: 'At least one use case is required' },
        { status: 400 }
      );
    }

    const db = getMasterDb();

    // Update onboarding record
    await db
      .update(schema.tenantOnboarding)
      .set({
        useCases,
        useCaseCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.tenantOnboarding.userId, session.userId));

    return NextResponse.json({
      success: true,
      message: 'Use case saved',
    });
  } catch (error) {
    console.error('Use case onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to save use case' },
      { status: 500 }
    );
  }
}
