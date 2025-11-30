import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/subscriptions/[id] - Get a single subscription by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const subscription = await db.subscription.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            workspaceName: true,
            slug: true,
            email: true,
          },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(subscription);
  } catch (error: unknown) {
    console.error('Error fetching subscription:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// PATCH /api/subscriptions/[id] - Update a subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const updateData: {
      plan?: string;
      billing?: string;
      status?: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID';
      cancelAtPeriodEnd?: boolean;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      trialEndsAt?: Date | null;
    } = {};

    if (body.plan !== undefined) updateData.plan = body.plan;
    if (body.billing !== undefined) updateData.billing = body.billing;
    if (body.status !== undefined) {
      // Map lowercase status to enum values
      const statusMap: Record<string, 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'> = {
        'trialing': 'TRIALING',
        'active': 'ACTIVE',
        'past_due': 'PAST_DUE',
        'canceled': 'CANCELED',
        'unpaid': 'UNPAID',
      };
      updateData.status = statusMap[body.status.toLowerCase()] || body.status;
    }
    if (body.cancelAtPeriodEnd !== undefined) updateData.cancelAtPeriodEnd = body.cancelAtPeriodEnd;
    if (body.currentPeriodStart !== undefined) updateData.currentPeriodStart = new Date(body.currentPeriodStart);
    if (body.currentPeriodEnd !== undefined) updateData.currentPeriodEnd = new Date(body.currentPeriodEnd);
    if (body.trialEndsAt !== undefined) updateData.trialEndsAt = body.trialEndsAt ? new Date(body.trialEndsAt) : null;

    const updatedSubscription = await db.subscription.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedSubscription);
  } catch (error: unknown) {
    console.error('Error updating subscription:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    // Handle not found error from Prisma
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}

// DELETE /api/subscriptions/[id] - Delete a subscription
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    await db.subscription.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting subscription:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    // Handle not found error from Prisma
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
