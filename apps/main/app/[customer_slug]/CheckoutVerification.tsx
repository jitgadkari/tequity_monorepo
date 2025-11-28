'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface CheckoutVerificationProps {
  tenantSlug: string;
}

export function CheckoutVerification({ tenantSlug }: CheckoutVerificationProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'pending' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;

    const verify = async () => {
      try {
        const res = await fetch('/api/platform/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantSlug }),
          credentials: 'include',
        });

        const data = await res.json();

        if (data.success && data.status === 'active') {
          // Tenant is now active, refresh the page
          router.refresh();
          return;
        }

        if (data.status === 'pending') {
          setStatus('pending');
          retryCount++;
          if (retryCount < maxRetries) {
            // Retry after 2 seconds
            setTimeout(verify, 2000);
          } else {
            setErrorMessage('Payment verification is taking longer than expected. Please refresh the page.');
            setStatus('error');
          }
          return;
        }

        // Some error occurred
        setErrorMessage(data.error || 'Failed to verify payment');
        setStatus('error');
      } catch {
        setErrorMessage('Network error. Please try refreshing the page.');
        setStatus('error');
      }
    };

    verify();
  }, [tenantSlug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-6">
        {status === 'verifying' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
            <h1 className="text-xl font-semibold text-slate-900 mt-4">
              Verifying Payment
            </h1>
            <p className="text-slate-600 mt-2">
              Please wait while we confirm your subscription...
            </p>
          </>
        )}

        {status === 'pending' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
            <h1 className="text-xl font-semibold text-slate-900 mt-4">
              Setting Up Your Workspace
            </h1>
            <p className="text-slate-600 mt-2">
              Your payment is being processed. This usually takes a few seconds...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <span className="text-red-600 text-xl">!</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mt-4">
              Verification Issue
            </h1>
            <p className="text-slate-600 mt-2">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800"
            >
              Refresh Page
            </button>
          </>
        )}
      </div>
    </div>
  );
}
