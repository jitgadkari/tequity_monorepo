'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const planDetails: Record<string, { name: string; price: string; features: string[] }> = {
  pro: {
    name: 'Pro',
    price: '$49/month',
    features: [
      'Unlimited workspaces',
      '25 team members',
      '50GB storage',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
    ],
  },
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan') || 'pro';
  const plan = planDetails[planId];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  useEffect(() => {
    if (!plan) {
      router.push('/pricing');
    }
  }, [plan, router]);

  if (!plan) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Mock payment processing - in production this would integrate with Polar.sh
      const res = await fetch('/api/platform/checkout/paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          // In production, this would be a Stripe/Polar token
          paymentToken: 'mock_payment_token',
        }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      // Redirect to workspace or provisioning status page
      router.push(data.redirectUrl || '/workspaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/pricing"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-8"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to pricing
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Order summary */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Order summary</h2>

            <div className="border-b border-slate-200 pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-slate-900">{plan.name} Plan</h3>
                  <p className="text-sm text-slate-600">Billed monthly</p>
                </div>
                <span className="font-bold text-slate-900">{plan.price}</span>
              </div>
            </div>

            <ul className="space-y-2 mb-6">
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

            <div className="border-t border-slate-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-900">Total</span>
                <span className="text-xl font-bold text-slate-900">{plan.price}</span>
              </div>
            </div>
          </div>

          {/* Payment form */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Payment details</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
              <strong>Demo mode:</strong> Payment processing is mocked. Enter any values to continue.
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name on card
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Card number
                </label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16),
                    })
                  }
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="4242 4242 4242 4242"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Expiry date
                  </label>
                  <input
                    type="text"
                    value={formData.expiry}
                    onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CVC</label>
                  <input
                    type="text"
                    value={formData.cvc}
                    onChange={(e) =>
                      setFormData({ ...formData, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })
                    }
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="123"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition mt-6"
              >
                {loading ? 'Processing...' : `Pay ${plan.price}`}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center mt-4">
              Your payment is secured with 256-bit SSL encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
