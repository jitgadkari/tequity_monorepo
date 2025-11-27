'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    features: [
      '1 workspace',
      '5 team members',
      '1GB storage',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Start free',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For growing teams',
    features: [
      'Unlimited workspaces',
      '25 team members',
      '50GB storage',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
    ],
    cta: 'Get started',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Unlimited storage',
      'SSO & SAML',
      'Dedicated support',
      'SLA guarantee',
    ],
    cta: 'Contact sales',
    popular: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'enterprise') {
      // For enterprise, redirect to contact
      window.location.href = 'mailto:sales@tequity.io?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    setLoading(planId);

    try {
      // For starter (free) plan, skip checkout and go directly to provisioning
      if (planId === 'starter') {
        const res = await fetch('/api/platform/checkout/free', {
          method: 'POST',
          credentials: 'include',
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to process');
        }

        // Redirect to the workspace or provisioning
        router.push(data.redirectUrl || '/workspaces');
      } else {
        // For paid plans, go to checkout
        router.push(`/checkout?plan=${planId}`);
      }
    } catch (err) {
      console.error('Plan selection error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900">Choose your plan</h1>
          <p className="text-slate-600 mt-2">
            Start free and scale as you grow. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg p-8 relative ${
                plan.popular ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
                <p className="text-slate-600 text-sm mt-1">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-600">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-slate-600">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 flex-shrink-0"
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

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-2 px-4 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {loading === plan.id ? 'Processing...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
