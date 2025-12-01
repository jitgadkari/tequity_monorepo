import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getMasterDb } from '@/lib/master-db';
import { ProvisioningPage } from './ProvisioningPage';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ customer_slug: string }>;
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { customer_slug } = await params;
  const session = await getSession();

  // Check if this is a public tenant route (signup/login within tenant)
  // These routes don't require session - they're tenant-specific auth pages
  // Note: The middleware handles session checks, so we just verify tenant exists

  const db = getMasterDb();

  // Verify tenant exists by slug
  const tenant = await db.tenant.findUnique({
    where: { slug: customer_slug },
  });

  if (!tenant) {
    // Tenant doesn't exist
    notFound();
  }

  // Check tenant status
  if (tenant.status !== 'ACTIVE') {
    // Tenant is not active (provisioning, suspended, etc.)
    if (tenant.status === 'PROVISIONING') {
      // Show provisioning page with auto-refresh
      return <ProvisioningPage tenantId={tenant.id} workspaceName={tenant.workspaceName || undefined} />;
    }

    // For other non-active states, show error
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-900">Workspace Unavailable</h1>
          <p className="text-slate-600 mt-2">This workspace is currently unavailable.</p>
        </div>
      </div>
    );
  }

  // If user is logged in, verify they own this tenant
  if (session) {
    // In the new model, tenantId in session should match this tenant
    if (session.tenantId !== tenant.id) {
      // User is logged in but trying to access a different tenant
      // This shouldn't normally happen - redirect to their own workspace
      if (session.tenantSlug) {
        redirect(`/${session.tenantSlug}/Dashboard/Library`);
      } else {
        redirect('/workspaces');
      }
    }
  }

  return <>{children}</>;
}
