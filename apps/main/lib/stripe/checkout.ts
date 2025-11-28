import { stripe } from './client';
import { getStripePriceId, TRIAL_PERIOD_DAYS, type PlanId, type BillingInterval } from './config';
import type Stripe from 'stripe';

export interface CreateCheckoutSessionParams {
  customerId?: string;
  customerEmail?: string;
  plan: PlanId;
  billing: BillingInterval;
  tenantId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  allowTrial?: boolean;
}

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession({
  customerId,
  customerEmail,
  plan,
  billing,
  tenantId,
  userId,
  successUrl,
  cancelUrl,
  allowTrial = true,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const priceId = getStripePriceId(plan, billing);

  if (!priceId) {
    throw new Error(`No Stripe price configured for ${plan} ${billing}`);
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      tenantId,
      userId,
      plan,
      billing,
    },
    subscription_data: {
      metadata: {
        tenantId,
        userId,
        plan,
        billing,
      },
    },
  };

  // Add customer or email
  if (customerId) {
    sessionParams.customer = customerId;
  } else if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  // Add trial period if allowed
  if (allowTrial && plan !== 'enterprise') {
    sessionParams.subscription_data!.trial_period_days = TRIAL_PERIOD_DAYS;
  }

  // Allow promotion codes
  sessionParams.allow_promotion_codes = true;

  // Collect billing address
  sessionParams.billing_address_collection = 'required';

  const session = await stripe.checkout.sessions.create(sessionParams);

  return session;
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Retrieve a checkout session
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['subscription', 'customer'],
  });
}
