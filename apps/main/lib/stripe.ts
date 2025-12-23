import Stripe from 'stripe';

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

// Pricing configuration - map plan names to Stripe Price IDs
// You'll need to create these products/prices in Stripe Dashboard
export const STRIPE_PLANS = {
  starter: {
    name: 'Starter',
    description: 'Best for early-stage startups',
    monthly: {
      priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID!,
      price: 15,
    },
    yearly: {
      priceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID!,
      price: 12, // per month, billed yearly ($144/year)
    },
    trialDays: 30,
    features: [
      '3 Paid Users',
      '200 Total Users',
      '1 TB Cloud Storage',
      'AI data room setup',
      'Basic investor access',
    ],
  },
  professional: {
    name: 'Professional',
    description: 'For large teams & corporations',
    monthly: {
      priceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID!,
      price: 30,
    },
    yearly: {
      priceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID!,
      price: 25, // per month, billed yearly ($300/year)
    },
    trialDays: 30,
    features: [
      '10 Paid Users',
      '1,000 Total Users',
      'Unlimited Cloud Storage',
      'Up to 3 active deal rooms',
      'Full AI-powered Q&A',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Best for business owners',
    monthly: {
      priceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!,
      price: 70,
    },
    yearly: {
      priceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID!,
      price: 59, // per month, billed yearly ($708/year)
    },
    trialDays: 30,
    features: [
      '20 Paid Users',
      'Unlimited Users',
      'Unlimited Cloud Storage',
      'Unlimited deal rooms',
      'Priority support',
    ],
  },
} as const;

export type PlanId = keyof typeof STRIPE_PLANS;
export type BillingPeriod = 'monthly' | 'yearly';

/**
 * Get the Stripe Price ID for a plan and billing period
 */
export function getStripePriceId(planId: PlanId, billing: BillingPeriod): string {
  const plan = STRIPE_PLANS[planId];
  if (!plan) {
    throw new Error(`Invalid plan: ${planId}`);
  }
  return plan[billing].priceId;
}

/**
 * Get plan details by Stripe Price ID
 */
export function getPlanByPriceId(priceId: string): { planId: PlanId; billing: BillingPeriod } | null {
  for (const [planId, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.monthly.priceId === priceId) {
      return { planId: planId as PlanId, billing: 'monthly' };
    }
    if (plan.yearly.priceId === priceId) {
      return { planId: planId as PlanId, billing: 'yearly' };
    }
  }
  return null;
}

/**
 * Create or get a Stripe customer for a tenant
 */
export async function getOrCreateStripeCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  // Check if customer already exists
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return stripe.customers.create({
    email,
    name: name || undefined,
    metadata,
  });
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  tenantId,
  tenantSlug,
  successUrl,
  cancelUrl,
  trialDays = 30,
}: {
  customerId: string;
  priceId: string;
  tenantId: string;
  tenantSlug: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: {
        tenantId,
        tenantSlug,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenantId,
      tenantSlug,
    },
    // Collect billing address
    billing_address_collection: 'required',
    // Allow promotion codes
    allow_promotion_codes: true,
  });
}

/**
 * Create a Stripe Customer Portal session for subscription management
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
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
 * Reactivate a subscription that was set to cancel
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Construct webhook event from raw body
 */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
