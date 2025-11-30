import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';
import { getRedirectForStage, getWorkspaceSetupStep } from '@/lib/onboarding-router';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getMasterDb();

    // Get tenant with onboarding session
    const tenant = await db.tenant.findUnique({
      where: { id: session.tenantId },
      include: {
        onboardingSession: true,
        pendingInvites: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            invitedAt: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const currentStage = tenant.onboardingSession?.currentStage || 'SIGNUP_STARTED';
    const redirectUrl = getRedirectForStage(currentStage, tenant.slug || undefined);
    const workspaceSetupStep = getWorkspaceSetupStep(currentStage);

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        email: tenant.email,
        fullName: tenant.fullName,
        emailVerified: tenant.emailVerified,
        workspaceName: tenant.workspaceName,
        slug: tenant.slug,
        status: tenant.status,
        useCase: tenant.useCase,
      },
      onboarding: {
        currentStage,
        workspaceSetupStep,
        redirectUrl,
        dataroomName: tenant.onboardingSession?.dataroomName,
        workflowConfig: tenant.onboardingSession?.workflowConfig,
        selectedPlan: tenant.onboardingSession?.selectedPlan,
        selectedBilling: tenant.onboardingSession?.selectedBilling,
        timestamps: {
          signupAt: tenant.onboardingSession?.signupAt,
          emailVerifiedAt: tenant.onboardingSession?.emailVerifiedAt,
          dataroomCreatedAt: tenant.onboardingSession?.dataroomCreatedAt,
          useCaseSelectedAt: tenant.onboardingSession?.useCaseSelectedAt,
          workflowSetupAt: tenant.onboardingSession?.workflowSetupAt,
          usersInvitedAt: tenant.onboardingSession?.usersInvitedAt,
          planSelectedAt: tenant.onboardingSession?.planSelectedAt,
          paymentCompletedAt: tenant.onboardingSession?.paymentCompletedAt,
          provisioningAt: tenant.onboardingSession?.provisioningAt,
          activatedAt: tenant.onboardingSession?.activatedAt,
        },
      },
      pendingInvites: tenant.pendingInvites,
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding status' },
      { status: 500 }
    );
  }
}
