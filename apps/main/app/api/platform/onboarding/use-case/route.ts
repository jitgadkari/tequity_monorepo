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

    const body = await request.json();
    // Support both single useCase string or useCases array
    const useCase = body.useCase;
    const useCases = body.useCases || (useCase ? [useCase] : []);

    if (!useCases || useCases.length === 0) {
      return NextResponse.json(
        { error: 'Please select a use case' },
        { status: 400 }
      );
    }

    const db = getMasterDb();

    // Get existing onboarding to merge with companyData
    const existingOnboarding = await db.query.tenantOnboarding.findFirst({
      where: eq(schema.tenantOnboarding.userId, session.userId),
    });

    const existingCompanyData = (existingOnboarding?.companyData as Record<string, unknown>) || {};

    // Update onboarding record - store useCases in companyData
    await db
      .update(schema.tenantOnboarding)
      .set({
        companyData: {
          ...existingCompanyData,
          useCases,
        },
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
