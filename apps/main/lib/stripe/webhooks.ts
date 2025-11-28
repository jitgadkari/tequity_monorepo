import { stripe } from './client';
import type Stripe from 'stripe';

// Extended Invoice type for compatibility
interface InvoiceWithSubscription extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription | null;
}

/**
 * Verify and construct Stripe webhook event
 */
export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Extract subscription details from webhook event
 */
export function extractSubscriptionFromEvent(event: Stripe.Event): {
  subscription: Stripe.Subscription | null;
  customerId: string | null;
  tenantId: string | null;
} {
  const data = event.data.object;

  let subscription: Stripe.Subscription | null = null;
  let customerId: string | null = null;
  let tenantId: string | null = null;

  // Check the event type to determine how to extract data
  if (event.type.startsWith('customer.subscription')) {
    subscription = data as Stripe.Subscription;
    customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as Stripe.Customer)?.id || null;
    tenantId = subscription.metadata?.tenantId || null;
  } else if (event.type.startsWith('invoice')) {
    const invoice = data as InvoiceWithSubscription;
    customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as Stripe.Customer)?.id || null;
    // Subscription ID may not be directly available
    tenantId = null; // Will be fetched via getSubscription in handler
  } else if (event.type.startsWith('checkout.session')) {
    const session = data as Stripe.Checkout.Session;
    customerId = typeof session.customer === 'string'
      ? session.customer
      : (session.customer as Stripe.Customer)?.id || null;
    tenantId = session.metadata?.tenantId || null;
  }

  return { subscription, customerId, tenantId };
}

/**
 * Log webhook event for debugging
 */
export function logWebhookEvent(event: Stripe.Event): void {
  console.log(`[Stripe Webhook] ${event.type}`, {
    id: event.id,
    created: new Date(event.created * 1000).toISOString(),
    livemode: event.livemode,
  });
}
