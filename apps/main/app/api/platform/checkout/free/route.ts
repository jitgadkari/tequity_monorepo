import { NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';

export async function POST() {
  try {
    const session = await getSession();
    console.log('[CHECKOUT/FREE] Session:', session ? { tenantId: session.tenantId } : null);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getMasterDb();

    // Get tenant to ensure they exist and have a slug
    const tenant = await db.tenant.findUnique({
      where: { id: session.tenantId },
      include: { onboardingSession: true },
    });

    console.log('[CHECKOUT/FREE] Found tenant:', tenant ? {
      id: tenant.id,
      slug: tenant.slug,
      status: tenant.status,
      onboardingStage: tenant.onboardingSession?.currentStage,
    } : null);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (!tenant.slug) {
      return NextResponse.json(
        { error: 'Please complete dataroom setup first' },
        { status: 400 }
      );
    }

    // Create subscription (free plan)
    const subscription = await db.subscription.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        plan: 'starter',
        billing: 'monthly',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        // Free plan doesn't expire
      },
      update: {
        plan: 'starter',
        billing: 'monthly',
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
      },
    });

    console.log('[CHECKOUT/FREE] Created/Updated subscription:', {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
    });

    // Update onboarding session with plan selection and payment completed
    const updatedSession = await db.onboardingSession.update({
      where: { tenantId: tenant.id },
      data: {
        selectedPlan: 'starter',
        selectedBilling: 'monthly',
        currentStage: 'PAYMENT_COMPLETED',
        planSelectedAt: new Date(),
        paymentCompletedAt: new Date(),
      },
    });

    console.log('[CHECKOUT/FREE] Updated onboarding session:', {
      id: updatedSession.id,
      currentStage: updatedSession.currentStage,
      selectedPlan: updatedSession.selectedPlan,
    });

    // Update tenant status
    const updatedTenant = await db.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'PROVISIONING',
      },
    });

    console.log('[CHECKOUT/FREE] Updated tenant status:', updatedTenant.status);

    // Update session with tenant slug
    await updateSession({
      tenantSlug: tenant.slug,
    });

    console.log('[CHECKOUT/FREE] Session updated with tenantSlug');

    // Queue tenant provisioning (async)
    // In production, this would trigger async provisioning via a job queue
    console.log('[CHECKOUT/FREE] Triggering provisioning...');
    const provisionRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/platform/provision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id }),
      }
    );

    if (!provisionRes.ok) {
      console.error('[CHECKOUT/FREE] Provisioning failed but continuing');
    } else {
      const provisionData = await provisionRes.json();
      console.log('[CHECKOUT/FREE] Provisioning result:', provisionData);
    }

    return NextResponse.json({
      success: true,
      redirectUrl: `/${tenant.slug}/Dashboard/Library`,
      tenantSlug: tenant.slug,
      tenantName: tenant.workspaceName,
    });
  } catch (error) {
    console.error('[CHECKOUT/FREE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    );
  }
}
