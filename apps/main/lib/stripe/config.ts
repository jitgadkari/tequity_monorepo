// Stripe price configuration
// These should be set in environment variables after creating products in Stripe Dashboard

export type PlanId = 'starter' | 'professional' | 'enterprise';
export type BillingInterval = 'monthly' | 'yearly';

export interface PlanConfig {
  name: string;
  description: string;
  features: string[];
  prices: {
    monthly: number;
    yearly: number;
  };
  stripePriceIds: {
    monthly: string | undefined;
    yearly: string | undefined;
  };
  limits: {
    storage: string;
    paidUsers: number;
    totalUsers: number;
    dealRooms: number;
  };
}

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    name: 'Starter',
    description: 'Best for early-stage startups',
    features: [
      '3 Paid Users',
      '200 Total Users',
      '1 TB Cloud Storage',
      'AI data room setup from file dump',
      'Auto-organization of up to 50 documents',
      'Basic investor access (view-only)',
      'Limited activity tracking (500 views)',
      'Email support',
    ],
    prices: {
      monthly: 1800, // $18.00 in cents
      yearly: 14400, // $144.00/year ($12/month)
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_STARTER_YEARLY,
    },
    limits: {
      storage: '1TB',
      paidUsers: 3,
      totalUsers: 200,
      dealRooms: 1,
    },
  },
  professional: {
    name: 'Professional',
    description: 'For large teams & corporations',
    features: [
      '10 Paid Users',
      '1,000 Total Users',
      'Unlimited Cloud Storage',
      'Up to 3 active deal rooms',
      'Full AI-powered Q&A + search',
      'Custom document requests & fulfillment',
      'Advanced activity tracking',
      'Slack/CRM integrations',
      'Email support',
    ],
    prices: {
      monthly: 3700, // $37.00 in cents
      yearly: 30000, // $300.00/year ($25/month)
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_ID_PROFESSIONAL_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_PROFESSIONAL_YEARLY,
    },
    limits: {
      storage: 'Unlimited',
      paidUsers: 10,
      totalUsers: 1000,
      dealRooms: 3,
    },
  },
  enterprise: {
    name: 'Enterprise',
    description: 'Best for business owners',
    features: [
      '20 Paid Users',
      'Unlimited Users',
      'Unlimited Cloud Storage',
      'Everything in Professional',
      'Unlimited deal rooms',
      'Multi-user teams + role-based permissions',
      'Audit logs & download tracking',
      'Priority support',
    ],
    prices: {
      monthly: 8800, // $88.00 in cents
      yearly: 70800, // $708.00/year ($59/month)
    },
    stripePriceIds: {
      monthly: process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY,
      yearly: process.env.STRIPE_PRICE_ID_ENTERPRISE_YEARLY,
    },
    limits: {
      storage: 'Unlimited',
      paidUsers: 20,
      totalUsers: -1, // unlimited
      dealRooms: -1, // unlimited
    },
  },
};

// Get price ID for a plan and billing interval
export function getStripePriceId(plan: PlanId, billing: BillingInterval): string | undefined {
  return PLANS[plan]?.stripePriceIds[billing];
}

// Get plan details
export function getPlanConfig(plan: PlanId): PlanConfig | undefined {
  return PLANS[plan];
}

// Validate plan ID
export function isValidPlan(plan: string): plan is PlanId {
  return ['starter', 'professional', 'enterprise'].includes(plan);
}

// Validate billing interval
export function isValidBillingInterval(billing: string): billing is BillingInterval {
  return ['monthly', 'yearly'].includes(billing);
}

// Trial period in days
export const TRIAL_PERIOD_DAYS = 30;

// Webhook events we handle
export const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.updated',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];
