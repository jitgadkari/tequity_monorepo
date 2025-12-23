/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';
import { createCustomerPortalSession } from '@/lib/stripe';

export async function POST(_request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getMasterDb();

    const subscription = await db.subscription.findUnique({
      where: { tenantId: session.tenantId },
      include: { tenant: true },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = subscription.tenant.slug
      ? `${baseUrl}/${subscription.tenant.slug}/Dashboard/Settings`
      : `${baseUrl}/workspaces`;

    // Create Stripe Customer Portal session
    const portalSession = await createCustomerPortalSession(
      subscription.stripeCustomerId,
      returnUrl
    );

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Customer portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
