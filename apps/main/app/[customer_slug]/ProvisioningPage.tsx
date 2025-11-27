'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProvisioningPageProps {
  tenantId: string;
}

export function ProvisioningPage({ tenantId }: ProvisioningPageProps) {
  const router = useRouter();

  useEffect(() => {
    // Trigger provisioning
    const triggerProvisioning = async () => {
      try {
        await fetch('/api/platform/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        });
      } catch (error) {
        console.error('Provisioning request failed:', error);
      }
    };

    triggerProvisioning();

    // Poll for status every 2 seconds
    const interval = setInterval(() => {
      router.refresh();
    }, 2000);

    return () => clearInterval(interval);
  }, [tenantId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-slate-900">Setting up your workspace</h1>
        <p className="text-slate-600 mt-2">This usually takes a few minutes...</p>
      </div>
    </div>
  );
}
