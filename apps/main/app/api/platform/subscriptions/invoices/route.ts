import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
import { getInvoices, isStripeConfigured } from '@/lib/stripe';

/**
 * GET /api/platform/subscriptions/invoices
 * Get invoice history for the current subscription
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

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

    // Get subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(schema.subscriptions.tenantId, membership.tenantId),
    });

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({
        invoices: [],
        message: 'No billing history available',
      });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({
        invoices: [],
        message: 'Payment processing is not configured',
      });
    }

    // Get invoices from Stripe
    const stripeInvoices = await getInvoices(subscription.stripeCustomerId, limit);

    const invoices = stripeInvoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      date: invoice.created ? new Date(invoice.created * 1000) : null,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : null,
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to get invoices' },
      { status: 500 }
    );
  }
}
