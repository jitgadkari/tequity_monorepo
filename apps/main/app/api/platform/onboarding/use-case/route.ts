import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    console.log('[ONBOARDING/USE-CASE] Session:', session ? { tenantId: session.tenantId } : null);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Support both single useCase string or useCases array
    const useCase = body.useCase;
    const useCases = body.useCases || (useCase ? [useCase] : []);
    console.log('[ONBOARDING/USE-CASE] Request body:', { useCase, useCases });

    if (!useCases || useCases.length === 0) {
      return NextResponse.json(
        { error: 'Please select a use case' },
        { status: 400 }
      );
    }

    const db = getMasterDb();

    // Update tenant with use case
    // Store primary use case in tenant, full list can be in settings if needed
    const updatedTenant = await db.tenant.update({
      where: { id: session.tenantId },
      data: {
        useCase: useCases[0], // Primary use case
      },
    });

    console.log('[ONBOARDING/USE-CASE] Updated tenant:', {
      id: updatedTenant.id,
      useCase: updatedTenant.useCase,
    });

    // Update onboarding session stage
    const updatedSession = await db.onboardingSession.update({
      where: { tenantId: session.tenantId },
      data: {
        currentStage: 'USE_CASE_SELECTED',
        useCaseSelectedAt: new Date(),
      },
    });

    console.log('[ONBOARDING/USE-CASE] Updated onboarding session:', {
      id: updatedSession.id,
      currentStage: updatedSession.currentStage,
    });

    return NextResponse.json({
      success: true,
      message: 'Use case saved',
    });
  } catch (error) {
    console.error('[ONBOARDING/USE-CASE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save use case' },
      { status: 500 }
    );
  }
}
