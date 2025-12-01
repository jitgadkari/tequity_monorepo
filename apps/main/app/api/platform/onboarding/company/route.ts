import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';
import { nanoid } from 'nanoid';

// Generate a unique tenant slug from name
function generateSlug(name: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  // Add unique suffix to ensure uniqueness
  return `${baseSlug}-${nanoid(6).toLowerCase()}`;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    console.log('[ONBOARDING/COMPANY] Session:', session ? { tenantId: session.tenantId } : null);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { companyName } = body;
    console.log('[ONBOARDING/COMPANY] Request body:', { companyName });

    // companyName is the dataroom/workspace name
    if (!companyName) {
      return NextResponse.json(
        { error: 'Dataroom name is required' },
        { status: 400 }
      );
    }

    // Validate workspace name
    const trimmedName = companyName.trim();

    if (trimmedName.length < 3) {
      return NextResponse.json(
        { error: 'Dataroom name must be at least 3 characters long' },
        { status: 400 }
      );
    }

    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: 'Dataroom name must not exceed 50 characters' },
        { status: 400 }
      );
    }

    // Prevent email addresses from being used as workspace names
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(trimmedName)) {
      return NextResponse.json(
        { error: 'Please enter a dataroom name, not an email address' },
        { status: 400 }
      );
    }

    const db = getMasterDb();

    // Generate a unique slug for the workspace URL
    const slug = generateSlug(trimmedName);
    console.log('[ONBOARDING/COMPANY] Generated slug:', slug);

    // Update tenant with workspace name and slug
    const updatedTenant = await db.tenant.update({
      where: { id: session.tenantId },
      data: {
        workspaceName: trimmedName,
        slug: slug,
      },
    });

    console.log('[ONBOARDING/COMPANY] Updated tenant:', {
      id: updatedTenant.id,
      workspaceName: updatedTenant.workspaceName,
      slug: updatedTenant.slug,
    });

    // Update onboarding session stage
    const updatedSession = await db.onboardingSession.update({
      where: { tenantId: session.tenantId },
      data: {
        dataroomName: trimmedName,
        currentStage: 'DATAROOM_CREATED',
        dataroomCreatedAt: new Date(),
      },
    });

    console.log('[ONBOARDING/COMPANY] Updated onboarding session:', {
      id: updatedSession.id,
      currentStage: updatedSession.currentStage,
      dataroomName: updatedSession.dataroomName,
    });

    // NOTE: Do NOT set tenantSlug in session here
    // tenantSlug should only be set after checkout is complete
    // Setting it early causes the platform layout to redirect to Dashboard
    // before the user has completed pricing/checkout

    return NextResponse.json({
      success: true,
      message: 'Dataroom name saved',
      slug: slug,
    });
  } catch (error) {
    console.error('[ONBOARDING/COMPANY] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save dataroom name' },
      { status: 500 }
    );
  }
}
