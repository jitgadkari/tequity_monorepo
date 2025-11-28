import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
import {
  getSubscription as getStripeSubscription,
  getUpcomingInvoice,
  getPlanConfig,
  isStripeConfigured,
} from '@/lib/stripe';
import type Stripe from 'stripe';

/**
 * GET /api/platform/subscriptions
 * Get current user's subscription details
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getMasterDb();

    // Get user's tenant membership
    const membership = await db.query.tenantMemberships.findFirst({
      where: eq(schema.tenantMemberships.userId, session.userId),
      with: {
        tenant: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 404 }
      );
    }

    // Get subscription for the tenant
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, membership.tenantId),
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Get plan details
    const planConfig = getPlanConfig(subscription.plan as 'starter' | 'professional' | 'enterprise');

    // Get Stripe subscription details if available
    let stripeSubscriptionData: Stripe.Subscription | null = null;
    let upcomingInvoiceData: Stripe.Invoice | null = null;

    if (isStripeConfigured() && subscription.stripeSubscriptionId) {
      stripeSubscriptionData = await getStripeSubscription(subscription.stripeSubscriptionId);
    }

    if (isStripeConfigured() && subscription.stripeCustomerId) {
      upcomingInvoiceData = await getUpcomingInvoice(subscription.stripeCustomerId);
    }

    return NextResponse.json({
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        planName: planConfig?.name || subscription.plan,
        billing: subscription.billing,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        features: planConfig?.features || [],
        limits: planConfig?.limits || {},
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
      },
      upcomingInvoice: upcomingInvoiceData
        ? {
            amount: upcomingInvoiceData.amount_due / 100,
            currency: upcomingInvoiceData.currency,
            dueDate: upcomingInvoiceData.due_date
              ? new Date(upcomingInvoiceData.due_date * 1000)
              : null,
          }
        : null,
      stripeDetails: stripeSubscriptionData
        ? {
            status: stripeSubscriptionData.status,
            cancelAt: stripeSubscriptionData.cancel_at
              ? new Date(stripeSubscriptionData.cancel_at * 1000)
              : null,
          }
        : null,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}
