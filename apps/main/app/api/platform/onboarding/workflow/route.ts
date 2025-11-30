import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    console.log('[ONBOARDING/WORKFLOW] Session:', session ? { tenantId: session.tenantId } : null);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowConfig } = body;
    console.log('[ONBOARDING/WORKFLOW] Request body:', { workflowConfig });

    // Workflow config is optional - can be skipped
    const config = workflowConfig || {};

    const db = getMasterDb();

    // Update onboarding session with workflow config and stage
    const updatedSession = await db.onboardingSession.update({
      where: { tenantId: session.tenantId },
      data: {
        workflowConfig: config,
        currentStage: 'WORKFLOW_SETUP',
        workflowSetupAt: new Date(),
      },
    });

    console.log('[ONBOARDING/WORKFLOW] Updated onboarding session:', {
      id: updatedSession.id,
      currentStage: updatedSession.currentStage,
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow configuration saved',
    });
  } catch (error) {
    console.error('[ONBOARDING/WORKFLOW] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save workflow configuration' },
      { status: 500 }
    );
  }
}
