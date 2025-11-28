import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
import {
  cancelSubscriptionAtPeriodEnd,
  cancelSubscriptionImmediately,
  resumeSubscription,
  isStripeConfigured,
} from '@/lib/stripe';

/**
 * POST /api/platform/subscriptions/cancel
 * Cancel subscription at period end or immediately
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { immediate = false } = await request.json();

    const db = getMasterDb();

    // Get user's tenant membership (must be owner or admin)
    const membership = await db.query.tenantMemberships.findFirst({
      where: eq(schema.tenantMemberships.userId, session.userId),
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 404 }
      );
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can cancel subscriptions' },
        { status: 403 }
      );
    }

    // Get subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, membership.tenantId),
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    if (!subscription.stripeSubscriptionId) {
      // For free tier or non-Stripe subscriptions, just update the database
      await db
        .update(schema.subscriptions)
        .set({
          status: 'canceled',
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.id, subscription.id));

      return NextResponse.json({
        success: true,
        message: 'Subscription canceled',
      });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    // Cancel Stripe subscription
    if (immediate) {
      await cancelSubscriptionImmediately(subscription.stripeSubscriptionId);

      await db
        .update(schema.subscriptions)
        .set({
          status: 'canceled',
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.id, subscription.id));
    } else {
      await cancelSubscriptionAtPeriodEnd(subscription.stripeSubscriptionId);

      await db
        .update(schema.subscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptions.id, subscription.id));
    }

    return NextResponse.json({
      success: true,
      message: immediate
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at period end',
      cancelAtPeriodEnd: !immediate,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/platform/subscriptions/cancel
 * Resume a subscription that was set to cancel at period end
 */
export async function DELETE() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getMasterDb();

    // Get user's tenant membership
    const membership = await db.query.tenantMemberships.findFirst({
      where: eq(schema.tenantMemberships.userId, session.userId),
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No workspace found' },
        { status: 404 }
      );
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can manage subscriptions' },
        { status: 403 }
      );
    }

    // Get subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, membership.tenantId),
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    if (!subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: 'Subscription is not set to cancel' },
        { status: 400 }
      );
    }

    if (subscription.stripeSubscriptionId && isStripeConfigured()) {
      await resumeSubscription(subscription.stripeSubscriptionId);
    }

    await db
      .update(schema.subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.id, subscription.id));

    return NextResponse.json({
      success: true,
      message: 'Subscription resumed',
    });
  } catch (error) {
    console.error('Resume subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}
