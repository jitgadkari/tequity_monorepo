import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { emails } = await request.json();

    // Emails are optional - user can skip this step
    const validEmails = (emails || []).filter(
      (email: string) => email && email.trim().length > 0
    );

    const db = getMasterDb();

    // Update onboarding record with invited emails
    await db
      .update(schema.tenantOnboarding)
      .set({
        teamEmails: validEmails,
        teamInvitesCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.tenantOnboarding.userId, session.userId));

    // TODO: Send invitation emails to the team members
    // This would typically involve:
    // 1. Creating invitation records in the database
    // 2. Sending emails via a service like SendGrid/Resend
    // For now, we just save the emails for later processing

    return NextResponse.json({
      success: true,
      message: validEmails.length > 0
        ? `Invitations saved for ${validEmails.length} team member(s)`
        : 'Team setup skipped',
      invitedCount: validEmails.length,
    });
  } catch (error) {
    console.error('Team onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to save team invitations' },
      { status: 500 }
    );
  }
}
