'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const planDetails: Record<
  string,
  {
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
  }
> = {
  starter: {
    name: 'Starter',
    monthlyPrice: 12,
    yearlyPrice: 96,
    features: [
      '1 Dataroom',
      '3 team members',
      '5GB storage',
      'Basic analytics',
      'Email support',
    ],
  },
  professional: {
    name: 'Professional',
    monthlyPrice: 25,
    yearlyPrice: 200,
    features: [
      '5 Datarooms',
      '10 team members',
      '25GB storage',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 59,
    yearlyPrice: 472,
    features: [
      'Unlimited Datarooms',
      'Unlimited team members',
      '100GB storage',
      'Advanced analytics & reporting',
      'Dedicated support',
      'Custom branding',
      'SSO integration',
      'API access',
    ],
  },
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan') || 'professional';
  const initialBilling = searchParams.get('billing') || 'monthly';
  const plan = planDetails[planId];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>(
    initialBilling as 'monthly' | 'yearly'
  );

  useEffect(() => {
    if (!plan) {
      router.push('/pricing');
    }
  }, [plan, router]);

  // Check for checkout cancelled
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'cancelled') {
      setError('Checkout was cancelled. You can try again when ready.');
    }
  }, [searchParams]);

  if (!plan) {
    return null;
  }

  const currentPrice = billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const monthlyEquivalent =
    billing === 'yearly' ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/platform/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          billing,
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-slate-50">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/pricing"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-8"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to pricing
        </Link>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Complete your purchase</h1>
          <p className="text-slate-600 mb-8">
            You're subscribing to the {plan.name} plan
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Billing toggle */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Billing period
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                  billing === 'monthly'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium">Monthly</div>
                <div className="text-sm text-slate-600">${plan.monthlyPrice}/month</div>
              </button>
              <button
                type="button"
                onClick={() => setBilling('yearly')}
                className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                  billing === 'yearly'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium">
                  Yearly
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Save {Math.round((1 - plan.yearlyPrice / 12 / plan.monthlyPrice) * 100)}%
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  ${plan.yearlyPrice}/year (${Math.round(plan.yearlyPrice / 12)}/month)
                </div>
              </button>
            </div>
          </div>

          {/* Order summary */}
          <div className="border-t border-slate-200 pt-6 mb-6">
            <h3 className="font-medium text-slate-900 mb-4">Order summary</h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-600">{plan.name} Plan ({billing})</span>
                <span className="font-medium">
                  ${currentPrice}/{billing === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>
              {billing === 'yearly' && (
                <div className="flex justify-between text-green-600 text-sm">
                  <span>Annual savings</span>
                  <span>-${plan.monthlyPrice * 12 - plan.yearlyPrice}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-900">Total</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-slate-900">${currentPrice}</span>
                  <span className="text-slate-600">/{billing === 'monthly' ? 'month' : 'year'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mb-8">
            <h3 className="font-medium text-slate-900 mb-3">What's included:</h3>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm text-slate-600">
                  <svg
                    className="w-4 h-4 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Trial info */}
          {planId !== 'enterprise' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-600 mr-2 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-blue-800">14-day free trial</p>
                  <p className="text-sm text-blue-700">
                    You won't be charged until your trial ends. Cancel anytime.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-4 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Redirecting to checkout...
              </span>
            ) : (
              `Continue to payment`
            )}
          </button>

          <p className="text-xs text-slate-500 text-center mt-4">
            You'll be redirected to Stripe to complete your purchase securely.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
