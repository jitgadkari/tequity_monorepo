'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get current user info
    const checkUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setEmail(data.user?.email || null);

          // If already verified, redirect
          if (data.user?.emailVerified) {
            router.push('/onboarding/company');
          }
        }
      } catch {
        // Not logged in
      }
    };
    checkUser();
  }, [router]);

  const handleResendCode = async () => {
    if (!email) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'email_verification' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      alert('A new verification code has been sent to your email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Check your email</h2>
      </div>

      <p className="text-slate-600 mb-6">
        We sent a verification code to{' '}
        <strong className="text-slate-900">{email || 'your email'}</strong>
        <br />
        Please check your inbox and enter the code on the signup page.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleResendCode}
          disabled={loading || !email}
          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Sending...' : 'Resend verification code'}
        </button>

        <button
          onClick={() => router.push('/signup')}
          className="w-full py-2 px-4 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
        >
          Back to signup
        </button>
      </div>
    </div>
  );
}
