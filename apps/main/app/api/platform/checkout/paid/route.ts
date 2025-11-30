import { NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, billing = 'monthly' } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const db = getMasterDb();

    // Get tenant to ensure they exist and have a slug
    const tenant = await db.tenant.findUnique({
      where: { id: session.tenantId },
      include: { onboardingSession: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (!tenant.slug) {
      return NextResponse.json(
        { error: 'Please complete dataroom setup first' },
        { status: 400 }
      );
    }

    // In production, this would redirect to Stripe/Polar for payment
    // For now, we create the subscription with PAYMENT_PENDING status
    // and then simulate successful payment

    // Update onboarding session with plan selection
    await db.onboardingSession.update({
      where: { tenantId: tenant.id },
      data: {
        selectedPlan: planId,
        selectedBilling: billing,
        currentStage: 'PLAN_SELECTED',
        planSelectedAt: new Date(),
      },
    });

    // In production: redirect to Stripe checkout
    // For demo: create subscription and mark as paid

    // Calculate period end based on billing cycle
    const periodEnd = new Date();
    if (billing === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create or update subscription (paid plan)
    await db.subscription.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        plan: planId,
        billing: billing,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        // In production: stripeSubscriptionId, stripeCustomerId, etc.
      },
      update: {
        plan: planId,
        billing: billing,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      },
    });

    // Update onboarding session with payment completed
    await db.onboardingSession.update({
      where: { tenantId: tenant.id },
      data: {
        currentStage: 'PAYMENT_COMPLETED',
        paymentCompletedAt: new Date(),
      },
    });

    // Update tenant status
    await db.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'PROVISIONING',
      },
    });

    // Update session with tenant slug
    await updateSession({
      tenantSlug: tenant.slug,
    });

    // Queue tenant provisioning (async)
    const provisionRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/platform/provision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id }),
      }
    );

    if (!provisionRes.ok) {
      console.error('Provisioning failed but continuing');
    }

    return NextResponse.json({
      success: true,
      redirectUrl: `/${tenant.slug}/Dashboard/Library`,
      tenantSlug: tenant.slug,
      tenantName: tenant.workspaceName,
    });
  } catch (error) {
    console.error('Paid checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
