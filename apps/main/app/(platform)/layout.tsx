import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
import { eq } from 'drizzle-orm';

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/signin');
  }

  // Get current path to avoid redirect loops
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  // If session has tenantSlug, user has completed checkout
  // Redirect them to their dashboard if on onboarding pages
  if (session.tenantSlug) {
    if (pathname === '/pricing' || pathname === '/workspace-setup' || pathname === '/checkout') {
      redirect(`/${session.tenantSlug}/Dashboard/Library`);
    }
    // Allow access to other platform pages (workspaces, billing, etc.)
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
      </div>
    );
  }

  // Check onboarding status and redirect appropriately
  const db = getMasterDb();
  const onboarding = await db.query.tenantOnboarding.findFirst({
    where: eq(schema.tenantOnboarding.userId, session.userId),
  });

  // Determine where user should be based on onboarding status
  if (onboarding) {
    // If payment is complete but session doesn't have tenantSlug yet
    // This can happen if session wasn't updated properly
    if (onboarding.paymentCompleted) {
      // Get their tenant membership
      const membership = await db.query.tenantMemberships.findFirst({
        where: eq(schema.tenantMemberships.userId, session.userId),
        with: {
          tenant: true,
        },
      });

      if (membership?.tenant) {
        // Redirect to dashboard
        if (pathname === '/pricing' || pathname === '/workspace-setup' || pathname === '/checkout') {
          redirect(`/${membership.tenant.slug}/Dashboard/Library`);
        }
      }
    }
    // If onboarding steps done but payment not complete, should be on pricing
    else if (onboarding.companyInfoCompleted && onboarding.useCaseCompleted && onboarding.teamInvitesCompleted) {
      if (pathname === '/workspace-setup') {
        redirect('/pricing');
      }
    }
    // If company/use-case done but team not done, should be on workspace-setup
    else if (onboarding.companyInfoCompleted && onboarding.useCaseCompleted && !onboarding.teamInvitesCompleted) {
      if (pathname === '/pricing') {
        redirect('/workspace-setup');
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
