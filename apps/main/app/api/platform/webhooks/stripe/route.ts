import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getMasterDb, schema } from '@/lib/master-db';
import {
  constructWebhookEvent,
  logWebhookEvent,
  mapStripeStatus,
  getSubscription,
} from '@/lib/stripe';
import type Stripe from 'stripe';

// Extended Stripe types for backward compatibility
// Stripe SDK v20 types may not include all runtime properties
interface SubscriptionWithPeriod extends Stripe.Subscription {
  current_period_start?: number;
  current_period_end?: number;
}

interface InvoiceWithSubscription extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription | null;
}

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] Missing signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = await constructWebhookEvent(body, signature);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  logWebhookEvent(event);

  const db = getMasterDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(db, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as SubscriptionWithPeriod;
        await handleSubscriptionUpdated(db, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as SubscriptionWithPeriod;
        await handleSubscriptionDeleted(db, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as InvoiceWithSubscription;
        await handlePaymentSucceeded(db, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as InvoiceWithSubscription;
        await handlePaymentFailed(db, invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutCompleted(
  db: ReturnType<typeof getMasterDb>,
  session: Stripe.Checkout.Session
) {
  const tenantId = session.metadata?.tenantId;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as Stripe.Subscription | null)?.id;

  if (!tenantId) {
    console.error('[Stripe Webhook] No tenantId in checkout session metadata');
    return;
  }

  console.log(`[Stripe Webhook] Checkout completed for tenant ${tenantId}`);

  // Get subscription details from Stripe
  let stripeSubscription: SubscriptionWithPeriod | null = null;
  if (subscriptionId) {
    stripeSubscription = (await getSubscription(subscriptionId)) as SubscriptionWithPeriod | null;
  }

  // Update subscription in database
  const updateData: Record<string, unknown> = {
    stripeCustomerId: customerId || null,
    stripeSubscriptionId: subscriptionId || null,
    stripePriceId: stripeSubscription?.items.data[0]?.price.id || null,
    status: stripeSubscription ? mapStripeStatus(stripeSubscription.status) : 'active',
    trialEndsAt: stripeSubscription?.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : null,
    updatedAt: new Date(),
  };

  // Add period timestamps if available
  if (stripeSubscription?.current_period_start) {
    updateData.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
  } else {
    updateData.currentPeriodStart = new Date();
  }

  if (stripeSubscription?.current_period_end) {
    updateData.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
  }

  await db
    .update(schema.subscriptions)
    .set(updateData)
    .where(eq(schema.subscriptions.tenantId, tenantId));

  // Update tenant status to active
  await db
    .update(schema.tenants)
    .set({
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));
}

/**
 * Handle customer.subscription.created/updated events
 */
async function handleSubscriptionUpdated(
  db: ReturnType<typeof getMasterDb>,
  subscription: SubscriptionWithPeriod
) {
  const tenantId = subscription.metadata?.tenantId;

  if (!tenantId) {
    console.error('[Stripe Webhook] No tenantId in subscription metadata');
    return;
  }

  console.log(`[Stripe Webhook] Subscription updated for tenant ${tenantId}: ${subscription.status}`);

  const updateData: Record<string, unknown> = {
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0]?.price.id || null,
    status: mapStripeStatus(subscription.status),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEndsAt: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    updatedAt: new Date(),
  };

  // Add period timestamps if available
  if (subscription.current_period_start) {
    updateData.currentPeriodStart = new Date(subscription.current_period_start * 1000);
  }
  if (subscription.current_period_end) {
    updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  }

  await db
    .update(schema.subscriptions)
    .set(updateData)
    .where(eq(schema.subscriptions.tenantId, tenantId));
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(
  db: ReturnType<typeof getMasterDb>,
  subscription: SubscriptionWithPeriod
) {
  const tenantId = subscription.metadata?.tenantId;

  if (!tenantId) {
    console.error('[Stripe Webhook] No tenantId in subscription metadata');
    return;
  }

  console.log(`[Stripe Webhook] Subscription deleted for tenant ${tenantId}`);

  await db
    .update(schema.subscriptions)
    .set({
      status: 'canceled',
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.tenantId, tenantId));

  // Optionally suspend the tenant
  await db
    .update(schema.tenants)
    .set({
      status: 'suspended',
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handlePaymentSucceeded(
  db: ReturnType<typeof getMasterDb>,
  invoice: InvoiceWithSubscription
) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : (invoice.subscription as Stripe.Subscription | null)?.id;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  // Get subscription to find tenantId
  const stripeSubscription = (await getSubscription(subscriptionId)) as SubscriptionWithPeriod | null;
  if (!stripeSubscription) return;

  const tenantId = stripeSubscription.metadata?.tenantId;
  if (!tenantId) return;

  console.log(`[Stripe Webhook] Payment succeeded for tenant ${tenantId}`);

  const updateData: Record<string, unknown> = {
    status: 'active',
    updatedAt: new Date(),
  };

  // Add period timestamps if available
  if (stripeSubscription.current_period_start) {
    updateData.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
  }
  if (stripeSubscription.current_period_end) {
    updateData.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
  }

  await db
    .update(schema.subscriptions)
    .set(updateData)
    .where(eq(schema.subscriptions.tenantId, tenantId));

  // Ensure tenant is active
  await db
    .update(schema.tenants)
    .set({
      status: 'active',
      updatedAt: new Date(),
    })
    .where(eq(schema.tenants.id, tenantId));
}

/**
 * Handle invoice.payment_failed event
 */
async function handlePaymentFailed(
  db: ReturnType<typeof getMasterDb>,
  invoice: InvoiceWithSubscription
) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : (invoice.subscription as Stripe.Subscription | null)?.id;

  if (!subscriptionId) {
    return; // Not a subscription invoice
  }

  // Get subscription to find tenantId
  const stripeSubscription = await getSubscription(subscriptionId);
  if (!stripeSubscription) return;

  const tenantId = stripeSubscription.metadata?.tenantId;
  if (!tenantId) return;

  console.log(`[Stripe Webhook] Payment failed for tenant ${tenantId}`);

  // Update subscription status to past_due
  await db
    .update(schema.subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.tenantId, tenantId));
}
