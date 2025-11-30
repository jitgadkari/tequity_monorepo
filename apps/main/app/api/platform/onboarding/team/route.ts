import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    console.log('[ONBOARDING/TEAM] Session:', session ? { tenantId: session.tenantId } : null);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emails, roles } = await request.json();
    console.log('[ONBOARDING/TEAM] Request body:', { emails, roles });

    // Emails are optional - tenant can skip this step
    const validEmails = (emails || []).filter(
      (email: string) => email && email.trim().length > 0
    );

    const db = getMasterDb();

    // Create PendingInvite records for each email
    if (validEmails.length > 0) {
      const inviteExpiry = new Date();
      inviteExpiry.setDate(inviteExpiry.getDate() + 7); // 7 days from now

      // Create pending invites in batch
      const result = await db.pendingInvite.createMany({
        data: validEmails.map((email: string, index: number) => ({
          tenantId: session.tenantId,
          email: email.toLowerCase().trim(),
          role: roles?.[index] || 'MEMBER', // Default to MEMBER if no role specified
          status: 'PENDING',
          expiresAt: inviteExpiry,
        })),
        skipDuplicates: true, // Skip if email already invited
      });

      console.log('[ONBOARDING/TEAM] Created pending invites:', {
        count: result.count,
        emails: validEmails,
      });
    }

    // Update onboarding session stage
    const updatedSession = await db.onboardingSession.update({
      where: { tenantId: session.tenantId },
      data: {
        currentStage: 'USERS_INVITED',
        usersInvitedAt: new Date(),
      },
    });

    console.log('[ONBOARDING/TEAM] Updated onboarding session:', {
      id: updatedSession.id,
      currentStage: updatedSession.currentStage,
    });

    // TODO: Send invitation emails to the team members
    // This would typically involve sending emails via a service like SendGrid/Resend
    // with the invite link containing inviteToken

    return NextResponse.json({
      success: true,
      message:
        validEmails.length > 0
          ? `Invitations saved for ${validEmails.length} team member(s)`
          : 'Team setup skipped',
      invitedCount: validEmails.length,
    });
  } catch (error) {
    console.error('[ONBOARDING/TEAM] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save team invitations' },
      { status: 500 }
    );
  }
}
