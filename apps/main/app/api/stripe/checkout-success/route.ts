import { NextResponse } from 'next/server';
import { getMasterDb } from '@/lib/master-db';
import { stripe, getPlanByPriceId } from '@/lib/stripe';
import type Stripe from 'stripe';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.redirect(new URL('/pricing?error=missing_session', request.url));
    }

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    // For trial subscriptions, status is 'complete' without payment_status being 'paid'
    if (checkoutSession.payment_status !== 'paid' && checkoutSession.status !== 'complete') {
      return NextResponse.redirect(new URL('/pricing?error=payment_failed', request.url));
    }

    const tenantId = checkoutSession.metadata?.tenantId;
    const tenantSlug = checkoutSession.metadata?.tenantSlug;

    if (!tenantId || !tenantSlug) {
      console.error('Missing tenant metadata in checkout session');
      return NextResponse.redirect(new URL('/pricing?error=invalid_session', request.url));
    }

    const db = getMasterDb();

    // Get subscription details
    const subscription = checkoutSession.subscription as Stripe.Subscription | null;
    const priceId = subscription?.items?.data?.[0]?.price?.id;
    const planInfo = priceId ? getPlanByPriceId(priceId) : null;

    // Extract customer ID (could be string or expanded object)
    const customerId = typeof checkoutSession.customer === 'string'
      ? checkoutSession.customer
      : (checkoutSession.customer as Stripe.Customer | null)?.id;

    // Get period dates from subscription items (new Stripe API structure)
    const subscriptionItem = subscription?.items?.data?.[0];
    const currentPeriodStart = subscriptionItem?.current_period_start
      ? new Date(subscriptionItem.current_period_start * 1000)
      : new Date();
    const currentPeriodEnd = subscriptionItem?.current_period_end
      ? new Date(subscriptionItem.current_period_end * 1000)
      : null;

    // Update subscription in database
    await db.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription?.id,
        stripePriceId: priceId,
        plan: planInfo?.planId || 'starter',
        billing: planInfo?.billing || 'monthly',
        status: subscription?.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
        trialEndsAt: subscription?.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        currentPeriodStart,
        currentPeriodEnd,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription?.id,
        stripePriceId: priceId,
        plan: planInfo?.planId || 'starter',
        billing: planInfo?.billing || 'monthly',
        status: subscription?.status === 'trialing' ? 'TRIALING' : 'ACTIVE',
        trialEndsAt: subscription?.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        currentPeriodStart,
        currentPeriodEnd,
      },
    });

    // Update onboarding status
    await db.onboardingSession.update({
      where: { tenantId },
      data: {
        currentStage: 'PAYMENT_COMPLETED',
        paymentCompletedAt: new Date(),
      },
    });

    // Update tenant status to provisioning
    await db.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'PROVISIONING',
      },
    });

    // Trigger provisioning
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    fetch(`${baseUrl}/api/platform/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    }).catch((err) => console.error('Provisioning trigger error:', err));

    // Redirect to dashboard
    return NextResponse.redirect(new URL(`/${tenantSlug}/Dashboard/Library`, request.url));
  } catch (error) {
    console.error('Checkout success handler error:', error);
    return NextResponse.redirect(new URL('/pricing?error=processing_failed', request.url));
  }
}
