import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';
import { getRedirectForStage } from '@/lib/onboarding-router';

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
    if (pathname === '/pricing' || pathname === '/workspace-setup' || pathname === '/checkout' || pathname === '/provisioning') {
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
  const tenant = await db.tenant.findUnique({
    where: { id: session.tenantId },
    include: {
      onboardingSession: true,
    },
  });

  if (!tenant) {
    // Tenant not found, redirect to signin
    redirect('/signin');
  }

  const currentStage = tenant.onboardingSession?.currentStage || 'SIGNUP_STARTED';
  const expectedPath = getRedirectForStage(currentStage, tenant.slug || undefined);

  // If tenant is ACTIVE, redirect to dashboard
  if (currentStage === 'ACTIVE' && tenant.slug) {
    if (pathname === '/pricing' || pathname === '/workspace-setup' || pathname === '/checkout' || pathname === '/provisioning') {
      redirect(`/${tenant.slug}/Dashboard/Library`);
    }
  }

  // Determine where user should be based on onboarding stage
  // Only redirect if user is on the wrong page
  if (pathname !== expectedPath && expectedPath !== pathname) {
    // Allow progression forward but not backward
    const stageOrder = [
      '/verify-email',
      '/workspace-setup',
      '/pricing',
      '/provisioning',
    ];

    const currentIndex = stageOrder.indexOf(pathname);
    const expectedIndex = stageOrder.indexOf(expectedPath);

    // If user is trying to go backward or to a wrong path, redirect
    if (currentIndex < expectedIndex || currentIndex === -1) {
      // Allow current path if it's a valid onboarding path
      if (stageOrder.includes(pathname)) {
        // User can stay on current page if they're ahead of expected
      } else {
        redirect(expectedPath);
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
