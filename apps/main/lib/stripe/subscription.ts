import { stripe } from './client';
import { getStripePriceId, type PlanId, type BillingInterval } from './config';
import type Stripe from 'stripe';

// Extended Stripe types for backward compatibility
interface SubscriptionWithPeriod extends Stripe.Subscription {
  current_period_start?: number;
  current_period_end?: number;
}

/**
 * Get a subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

/**
 * Get subscriptions for a customer
 */
export async function getCustomerSubscriptions(
  customerId: string
): Promise<Stripe.Subscription[]> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
  });
  return subscriptions.data;
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Cancel a subscription immediately
 */
export async function cancelSubscriptionImmediately(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.cancel(subscriptionId);
}

/**
 * Resume a subscription that was set to cancel at period end
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Change subscription plan (upgrade/downgrade)
 */
export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPlan: PlanId,
  newBilling: BillingInterval,
  prorate: boolean = true
): Promise<Stripe.Subscription> {
  const priceId = getStripePriceId(newPlan, newBilling);

  if (!priceId) {
    throw new Error(`No Stripe price configured for ${newPlan} ${newBilling}`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItemId = subscription.items.data[0].id;

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscriptionItemId,
        price: priceId,
      },
    ],
    proration_behavior: prorate ? 'create_prorations' : 'none',
    metadata: {
      ...subscription.metadata,
      plan: newPlan,
      billing: newBilling,
    },
  });
}

/**
 * Preview proration for plan change
 */
export async function previewPlanChange(
  subscriptionId: string,
  newPlan: PlanId,
  newBilling: BillingInterval
): Promise<Stripe.Invoice> {
  const priceId = getStripePriceId(newPlan, newBilling);

  if (!priceId) {
    throw new Error(`No Stripe price configured for ${newPlan} ${newBilling}`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItemId = subscription.items.data[0].id;

  return stripe.invoices.createPreview({
    subscription: subscriptionId,
    subscription_details: {
      items: [
        {
          id: subscriptionItemId,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    },
  });
}

/**
 * Get upcoming invoice
 */
export async function getUpcomingInvoice(
  customerId: string
): Promise<Stripe.Invoice | null> {
  try {
    // Use list with limit 1 and upcoming filter as fallback
    const invoices = await stripe.invoices.list({
      customer: customerId,
      status: 'draft',
      limit: 1,
    });
    return invoices.data[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get invoice history
 */
export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });
  return invoices.data;
}

/**
 * Map Stripe subscription status to our database status
 */
export function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    case 'unpaid':
    case 'incomplete':
    case 'paused':
      return 'unpaid';
    default:
      return 'active';
  }
}

/**
 * Helper to get current period timestamps from subscription
 */
export function getSubscriptionPeriod(subscription: Stripe.Subscription): {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} {
  const sub = subscription as SubscriptionWithPeriod;
  return {
    currentPeriodStart: sub.current_period_start
      ? new Date(sub.current_period_start * 1000)
      : null,
    currentPeriodEnd: sub.current_period_end
      ? new Date(sub.current_period_end * 1000)
      : null,
  };
}
