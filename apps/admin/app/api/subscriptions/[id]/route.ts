import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

// PATCH /api/subscriptions/[id] - Update a subscription
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin authentication
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();

    // Only update allowed fields
    const updateData: any = {};

    if (body.amount !== undefined) updateData.amount = body.amount.toString();
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) {
      updateData.status = body.status;
      // If marking as paid, set payment date
      if (body.status === 'paid') {
        updateData.paymentDate = new Date();
      }
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    const [updatedSubscription] = await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, id))
      .returning();

    if (!updatedSubscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSubscription);
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
    // Require admin authentication
    await requireAdmin();

    const { id } = await params;

    const [deletedSubscription] = await db
      .delete(subscriptions)
      .where(eq(subscriptions.id, id))
      .returning();

    if (!deletedSubscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting subscription:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
