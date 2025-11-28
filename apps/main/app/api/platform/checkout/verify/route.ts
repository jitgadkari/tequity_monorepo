import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
import { stripe, mapStripeStatus } from '@/lib/stripe';

/**
 * Verify checkout and activate tenant
 * This handles the case where webhook hasn't arrived yet
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantSlug } = await request.json();

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant slug required' }, { status: 400 });
    }

    const db = getMasterDb();

    // Get tenant
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.slug, tenantSlug),
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // If already active, just return success
    if (tenant.status === 'active') {
      return NextResponse.json({ success: true, status: 'active' });
    }

    // Get subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, tenant.id),
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    // Check Stripe for active subscription
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: subscription.stripeCustomerId,
      status: 'all',
      limit: 1,
    });

    const stripeSubscription = stripeSubscriptions.data[0];

    if (!stripeSubscription) {
      // No subscription yet - payment might still be processing
      return NextResponse.json({ success: false, status: 'pending', message: 'Payment processing' });
    }

    // Update subscription in database
    await db
      .update(schema.subscriptions)
      .set({
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price.id || null,
        status: mapStripeStatus(stripeSubscription.status),
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.tenantId, tenant.id));

    // Update tenant status to active
    await db
      .update(schema.tenants)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, tenant.id));

    return NextResponse.json({
      success: true,
      status: 'active',
      subscriptionStatus: stripeSubscription.status,
    });
  } catch (error) {
    console.error('Checkout verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify checkout' },
      { status: 500 }
    );
  }
}
