import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';
import {
  stripe,
  cancelSubscriptionAtPeriodEnd,
  reactivateSubscription,
  getSubscription,
  STRIPE_PLANS,
} from '@/lib/stripe';

// GET - Get current subscription details
export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getMasterDb();

    const subscription = await db.subscription.findUnique({
      where: { tenantId: session.tenantId },
    });

    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    // Get real-time data from Stripe if we have a subscription ID
    let stripeSubscription: Awaited<ReturnType<typeof getSubscription>> | null = null;
    if (subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await getSubscription(subscription.stripeSubscriptionId);
      } catch (err) {
        console.error('Error fetching Stripe subscription:', err);
      }
    }

    // Get plan details
    const planConfig = STRIPE_PLANS[subscription.plan as keyof typeof STRIPE_PLANS];

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        planName: planConfig?.name || subscription.plan,
        billing: subscription.billing,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        price: planConfig?.[subscription.billing as 'monthly' | 'yearly']?.price || 0,
        features: planConfig?.features || [],
        // Real-time Stripe data
        stripeStatus: stripeSubscription?.status || null,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}

// PATCH - Update subscription (cancel/reactivate)
export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (!action || !['cancel', 'reactivate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const db = getMasterDb();

    const subscription = await db.subscription.findUnique({
      where: { tenantId: session.tenantId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
    }

    let updatedStripeSubscription;

    if (action === 'cancel') {
      // Cancel at period end (not immediately)
      updatedStripeSubscription = await cancelSubscriptionAtPeriodEnd(
        subscription.stripeSubscriptionId
      );

      await db.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });
    } else if (action === 'reactivate') {
      // Reactivate a subscription that was set to cancel
      updatedStripeSubscription = await reactivateSubscription(
        subscription.stripeSubscriptionId
      );

      await db.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: false },
      });
    }

    return NextResponse.json({
      success: true,
      subscription: {
        cancelAtPeriodEnd: updatedStripeSubscription?.cancel_at_period_end,
        currentPeriodEnd: updatedStripeSubscription?.current_period_end
          ? new Date(updatedStripeSubscription.current_period_end * 1000)
          : null,
      },
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
