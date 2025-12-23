import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';
import {
  getStripePriceId,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  STRIPE_PLANS,
  type PlanId,
  type BillingPeriod,
} from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, billing = 'monthly' } = (await request.json()) as {
      planId: PlanId;
      billing: BillingPeriod;
    };

    // Validate plan
    if (!planId || !STRIPE_PLANS[planId]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Validate billing period
    if (billing !== 'monthly' && billing !== 'yearly') {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
    }

    const db = getMasterDb();

    // Get tenant
    const tenant = await db.tenant.findUnique({
      where: { id: session.tenantId },
      include: {
        onboardingSession: true,
        subscription: true,
      },
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

    // Get or create Stripe customer
    let stripeCustomerId = tenant.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await getOrCreateStripeCustomer(tenant.email, tenant.fullName || undefined, {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      });
      stripeCustomerId = customer.id;
    }

    // Get the Stripe Price ID for the selected plan
    const priceId = getStripePriceId(planId, billing);
    const planConfig = STRIPE_PLANS[planId];

    // Create Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutSession = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      successUrl: `${baseUrl}/api/stripe/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
      trialDays: planConfig.trialDays,
    });

    // Update onboarding session with plan selection
    await db.onboardingSession.update({
      where: { tenantId: tenant.id },
      data: {
        selectedPlan: planId,
        selectedBilling: billing,
        currentStage: 'PAYMENT_PENDING',
        planSelectedAt: new Date(),
      },
    });

    // Store Stripe customer ID if new
    if (!tenant.subscription?.stripeCustomerId) {
      await db.subscription.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          stripeCustomerId,
          plan: planId,
          billing,
          status: 'TRIALING', // Will be updated by webhook
        },
        update: {
          stripeCustomerId,
          plan: planId,
          billing,
        },
      });
    }

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
