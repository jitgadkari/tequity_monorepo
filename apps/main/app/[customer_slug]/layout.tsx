import { redirect, notFound } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
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

  // Verify tenant exists
  const tenant = await db.query.tenants.findFirst({
    where: eq(schema.tenants.slug, customer_slug),
  });

  if (!tenant) {
    // Tenant doesn't exist
    notFound();
  }

  // Check tenant status
  if (tenant.status !== 'active') {
    // Tenant is not active (provisioning, suspended, etc.)
    if (tenant.status === 'provisioning') {
      // Show provisioning page with auto-refresh
      return <ProvisioningPage tenantId={tenant.id} />;
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

  // If user is logged in, verify membership for protected routes
  if (session) {
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(schema.tenantMemberships.tenantId, tenant.id),
        eq(schema.tenantMemberships.userId, session.userId)
      ),
    });

    if (!membership) {
      // User is logged in but not a member of this tenant
      redirect('/workspaces');
    }
  }

  return <>{children}</>;
}
