import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
import { generateSlug } from '@tequity/utils';
import {
  createCheckoutSession,
  createStripeCustomer,
  isStripeConfigured,
  isValidPlan,
  isValidBillingInterval,
  type PlanId,
  type BillingInterval,
} from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, billing = 'monthly' } = await request.json();

    if (!plan || !isValidPlan(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be starter, professional, or enterprise' },
        { status: 400 }
      );
    }

    if (!isValidBillingInterval(billing)) {
      return NextResponse.json(
        { error: 'Invalid billing interval. Must be monthly or yearly' },
        { status: 400 }
      );
    }

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const db = getMasterDb();

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get onboarding data
    const onboarding = await db.query.tenantOnboarding.findFirst({
      where: eq(schema.tenantOnboarding.userId, session.userId),
    });

    if (!onboarding) {
      return NextResponse.json(
        { error: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Get company name from companyData JSON
    const companyData = onboarding.companyData as Record<string, unknown> | null;
    const companyName = (companyData?.companyName as string) || 'My Workspace';
    const slug = generateSlug(companyName);

    // Check if slug already exists
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.slug, slug),
    });

    const finalSlug = existingTenant ? `${slug}-${Date.now().toString(36)}` : slug;

    // Create tenant with pending_payment status
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: companyName,
        slug: finalSlug,
        status: 'pending_payment',
      })
      .returning();

    // Create subscription record (will be updated by webhook)
    await db.insert(schema.subscriptions).values({
      tenantId: tenant.id,
      plan: plan as PlanId,
      billing: billing as BillingInterval,
      status: 'unpaid', // Will be updated to trialing/active by webhook
    });

    // Create tenant membership
    await db.insert(schema.tenantMemberships).values({
      tenantId: tenant.id,
      userId: session.userId,
      role: 'owner',
    });

    // Create Stripe customer
    const stripeCustomer = await createStripeCustomer({
      email: user.email,
      name: user.fullName || undefined,
      tenantId: tenant.id,
      tenantName: companyName,
    });

    // Update subscription with Stripe customer ID
    await db
      .update(schema.subscriptions)
      .set({
        stripeCustomerId: stripeCustomer.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.tenantId, tenant.id));

    // Create Stripe Checkout session
    const baseUrl = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || 'http://localhost:3000';

    const checkoutSession = await createCheckoutSession({
      customerId: stripeCustomer.id,
      plan: plan as PlanId,
      billing: billing as BillingInterval,
      tenantId: tenant.id,
      userId: session.userId,
      successUrl: `${baseUrl}/${finalSlug}/Dashboard/Library?checkout=success`,
      cancelUrl: `${baseUrl}/pricing?checkout=cancelled`,
      allowTrial: true,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      tenantSlug: finalSlug,
    });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
