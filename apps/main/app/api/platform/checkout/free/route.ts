import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession, updateSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
import { nanoid } from 'nanoid';

// Generate a unique tenant slug (not based on user input)
function generateTenantSlug(): string {
  // Generate a short, unique ID like "t-abc123xyz"
  return `t-${nanoid(10).toLowerCase()}`;
}

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getMasterDb();

    // Get onboarding data to create tenant
    const onboarding = await db.query.tenantOnboarding.findFirst({
      where: eq(schema.tenantOnboarding.userId, session.userId),
    });

    if (!onboarding) {
      return NextResponse.json(
        { error: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Get company/dataroom name from companyData JSON
    const companyData = onboarding.companyData as Record<string, unknown> | null;
    const dataroomName = (companyData?.companyName as string) || 'My Workspace';

    // Generate a unique tenant slug (NOT based on dataroom name)
    // This ensures unique URLs and avoids conflicts
    const tenantSlug = generateTenantSlug();

    // Create tenant with unique slug
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: dataroomName, // User-friendly name for display
        slug: tenantSlug,   // Unique URL-safe identifier
        status: 'provisioning',
        useCase: onboarding.useCaseCompleted ? 'investor' : undefined, // From onboarding
      })
      .returning();

    // Link onboarding to tenant
    await db
      .update(schema.tenantOnboarding)
      .set({
        tenantId: tenant.id,
        updatedAt: new Date(),
      })
      .where(eq(schema.tenantOnboarding.userId, session.userId));

    // Create subscription (free plan)
    await db.insert(schema.subscriptions).values({
      tenantId: tenant.id,
      plan: 'starter',
      billing: 'monthly',
      status: 'active',
      currentPeriodStart: new Date(),
      // Free plan doesn't expire
    });

    // Create tenant membership
    await db.insert(schema.tenantMemberships).values({
      tenantId: tenant.id,
      userId: session.userId,
      role: 'owner',
    });

    // Mark onboarding as complete
    await db
      .update(schema.tenantOnboarding)
      .set({
        paymentCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.tenantOnboarding.userId, session.userId));

    // Update user onboarding status
    await db
      .update(schema.users)
      .set({
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, session.userId));

    // Update session with tenant info
    await updateSession({
      onboardingCompleted: true,
      tenantSlug: tenantSlug,
    });

    // Queue tenant provisioning (in production, this would trigger async provisioning)
    // For now, we'll do it synchronously in the provision API
    const provisionRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/platform/provision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id }),
      }
    );

    if (!provisionRes.ok) {
      console.error('Provisioning failed but continuing');
    }

    return NextResponse.json({
      success: true,
      redirectUrl: `/${tenantSlug}/Dashboard/Library`,
      tenantSlug: tenantSlug,
      tenantName: dataroomName,
    });
  } catch (error) {
    console.error('Free checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    );
  }
}
