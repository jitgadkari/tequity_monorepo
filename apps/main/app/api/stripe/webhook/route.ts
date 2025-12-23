import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getMasterDb } from '@/lib/master-db';
import { stripe, getPlanByPriceId } from '@/lib/stripe';
import type Stripe from 'stripe';

type MasterDbClient = ReturnType<typeof getMasterDb>;

// Disable body parsing for webhook
export const dynamic = 'force-dynamic';

// Helper to get subscription period dates
function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return {
    currentPeriodStart: item?.current_period_start
      ? new Date(item.current_period_start * 1000)
      : new Date(),
    currentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getMasterDb();

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(db, session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(db, subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(db, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(db, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(db, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(db, invoice);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(db, subscription);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(db: MasterDbClient, session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId;
  if (!tenantId) {
    console.error('[Stripe Webhook] No tenantId in checkout session metadata');
    return;
  }

  console.log(`[Stripe Webhook] Checkout completed for tenant: ${tenantId}`);

  // The subscription is created separately, so we mainly update onboarding status here
  await db.onboardingSession.update({
    where: { tenantId },
    data: {
      currentStage: 'PAYMENT_COMPLETED',
      paymentCompletedAt: new Date(),
    },
  });
}

async function handleSubscriptionCreated(db: MasterDbClient, subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId;
  const customerId = subscription.customer as string;

  // Find tenant by customer ID if tenantId not in metadata
  let tenant;
  if (tenantId) {
    tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  } else {
    const existingSubscription = await db.subscription.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (existingSubscription) {
      tenant = await db.tenant.findUnique({ where: { id: existingSubscription.tenantId } });
    }
  }

  if (!tenant) {
    console.error('[Stripe Webhook] Could not find tenant for subscription');
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? getPlanByPriceId(priceId) : null;
  const period = getSubscriptionPeriod(subscription);

  console.log(`[Stripe Webhook] Subscription created for tenant: ${tenant.id}, status: ${subscription.status}`);

  await db.subscription.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan: planInfo?.planId || 'starter',
      billing: planInfo?.billing || 'monthly',
      status: mapStripeStatus(subscription.status),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan: planInfo?.planId || 'starter',
      billing: planInfo?.billing || 'monthly',
      status: mapStripeStatus(subscription.status),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionUpdated(db: MasterDbClient, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const existingSubscription = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!existingSubscription) {
    console.error('[Stripe Webhook] No subscription found for customer:', customerId);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? getPlanByPriceId(priceId) : null;
  const period = getSubscriptionPeriod(subscription);

  console.log(`[Stripe Webhook] Subscription updated for tenant: ${existingSubscription.tenantId}, status: ${subscription.status}`);

  await db.subscription.update({
    where: { id: existingSubscription.id },
    data: {
      stripePriceId: priceId,
      plan: planInfo?.planId || existingSubscription.plan,
      billing: planInfo?.billing || existingSubscription.billing,
      status: mapStripeStatus(subscription.status),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  // Update tenant status based on subscription status
  const tenant = await db.tenant.findUnique({ where: { id: existingSubscription.tenantId } });
  if (tenant) {
    let tenantStatus = tenant.status;
    if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      tenantStatus = 'SUSPENDED';
    } else if (subscription.status === 'active' || subscription.status === 'trialing') {
      if (tenant.status === 'SUSPENDED') {
        tenantStatus = 'ACTIVE';
      }
    }

    if (tenantStatus !== tenant.status) {
      await db.tenant.update({
        where: { id: tenant.id },
        data: { status: tenantStatus },
      });
    }
  }
}

async function handleSubscriptionDeleted(db: MasterDbClient, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const existingSubscription = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!existingSubscription) {
    console.error('[Stripe Webhook] No subscription found for customer:', customerId);
    return;
  }

  console.log(`[Stripe Webhook] Subscription deleted for tenant: ${existingSubscription.tenantId}`);

  await db.subscription.update({
    where: { id: existingSubscription.id },
    data: {
      status: 'CANCELED',
      cancelAtPeriodEnd: false,
    },
  });

  // Update tenant status
  await db.tenant.update({
    where: { id: existingSubscription.tenantId },
    data: { status: 'CANCELLED' },
  });
}

async function handleInvoicePaymentSucceeded(db: MasterDbClient, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const subscription = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!subscription) {
    console.log('[Stripe Webhook] No subscription found for invoice payment success');
    return;
  }

  console.log(`[Stripe Webhook] Invoice payment succeeded for tenant: ${subscription.tenantId}`);

  // Ensure subscription is active after successful payment
  if (subscription.status === 'PAST_DUE' || subscription.status === 'UNPAID') {
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: 'ACTIVE' },
    });

    // Reactivate tenant if suspended
    const tenant = await db.tenant.findUnique({ where: { id: subscription.tenantId } });
    if (tenant?.status === 'SUSPENDED') {
      await db.tenant.update({
        where: { id: tenant.id },
        data: { status: 'ACTIVE' },
      });
    }
  }
}

async function handleInvoicePaymentFailed(db: MasterDbClient, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const subscription = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!subscription) {
    console.log('[Stripe Webhook] No subscription found for invoice payment failure');
    return;
  }

  console.log(`[Stripe Webhook] Invoice payment failed for tenant: ${subscription.tenantId}`);

  await db.subscription.update({
    where: { id: subscription.id },
    data: { status: 'PAST_DUE' },
  });

  // TODO: Send email notification about failed payment
}

async function handleTrialWillEnd(db: MasterDbClient, subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const existingSubscription = await db.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { tenant: true },
  });

  if (!existingSubscription) {
    console.log('[Stripe Webhook] No subscription found for trial ending notification');
    return;
  }

  console.log(`[Stripe Webhook] Trial will end in 3 days for tenant: ${existingSubscription.tenantId}`);

  // TODO: Send email notification about trial ending
  // The trial_will_end event fires 3 days before trial ends by default
}

type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
      return 'CANCELED';
    case 'unpaid':
      return 'UNPAID';
    default:
      return 'ACTIVE';
  }
}
