import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
import { createCustomerPortalSession, isStripeConfigured } from '@/lib/stripe';

/**
 * POST /api/platform/subscriptions/portal
 * Create a Stripe Customer Portal session
 * This allows customers to manage their subscription, payment methods, and view invoices
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const { returnUrl } = await request.json();

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

    // Get subscription to get Stripe customer ID
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, membership.tenantId),
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please contact support.' },
        { status: 404 }
      );
    }

    // Create portal session
    const baseUrl = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'http://localhost:3000';
    const defaultReturnUrl = `${baseUrl}/${membership.tenant.slug}/Dashboard/Settings`;

    const portalSession = await createCustomerPortalSession(
      subscription.stripeCustomerId,
      returnUrl || defaultReturnUrl
    );

    return NextResponse.json({
      success: true,
      portalUrl: portalSession.url,
    });
  } catch (error) {
    console.error('Create portal session error:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
