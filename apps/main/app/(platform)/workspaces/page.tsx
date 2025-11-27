import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getMasterDb, schema } from '@/lib/master-db';
import { LogoutButton } from './LogoutButton';

export default async function WorkspacesPage() {
  const session = await getSession();

  if (!session) {
    redirect('/signin');
  }

  const db = getMasterDb();

  // Check if onboarding is complete
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId),
  });

  if (user && !user.onboardingCompleted) {
    redirect('/workspace-setup');
  }

  // Get user's tenant memberships
  const memberships = await db.query.tenantMemberships.findMany({
    where: eq(schema.tenantMemberships.userId, session.userId),
  });

  // Get tenant details for each membership
  const tenants = await Promise.all(
    memberships.map(async (membership) => {
      const tenant = await db.query.tenants.findFirst({
        where: eq(schema.tenants.id, membership.tenantId),
      });
      return tenant
        ? {
            ...tenant,
            role: membership.role,
          }
        : null;
    })
  ).then((results) => results.filter(Boolean));

  // If user has any tenants, redirect to first one's Dashboard
  if (tenants.length > 0) {
    const activeTenant = tenants.find((t) => t && t.status === 'active');
    const anyTenant = tenants.find((t) => t);

    if (activeTenant) {
      redirect(`/${activeTenant.slug}/Dashboard/Library`);
    } else if (anyTenant) {
      redirect(`/${anyTenant.slug}/Dashboard/Library`);
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Workspaces</h1>
            <p className="text-slate-600 mt-1">Select a workspace to continue</p>
          </div>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <Link
              href="/pricing"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Workspace
            </Link>
          </div>
        </div>

        {tenants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No workspaces yet</h2>
            <p className="text-slate-600 mb-6">
              Create your first workspace to get started with Tequity.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Create Workspace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tenants.map((tenant) => {
              if (!tenant) return null;

              const isProvisioning = tenant.status === 'provisioning';
              const isPending = tenant.status === 'pending_payment' || tenant.status === 'pending_onboarding';
              const isActive = tenant.status === 'active';

              return (
                <div key={tenant.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl font-bold text-blue-600">
                        {tenant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        isActive
                          ? 'bg-green-100 text-green-700'
                          : isProvisioning
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isActive
                        ? 'Active'
                        : isProvisioning
                        ? 'Setting up...'
                        : tenant.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900">{tenant.name}</h3>
                  <p className="text-sm text-slate-600 mb-4">/{tenant.slug}</p>

                  {isActive ? (
                    <Link
                      href={`/${tenant.slug}/Dashboard`}
                      className="block w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-center transition"
                    >
                      Open Workspace
                    </Link>
                  ) : isProvisioning ? (
                    <button
                      disabled
                      className="block w-full py-2 px-4 bg-slate-100 text-slate-500 font-medium rounded-lg cursor-not-allowed"
                    >
                      Setting up...
                    </button>
                  ) : isPending ? (
                    <Link
                      href="/pricing"
                      className="block w-full py-2 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 text-center transition"
                    >
                      Complete Setup
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
