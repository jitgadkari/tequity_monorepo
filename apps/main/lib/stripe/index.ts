// Stripe utilities barrel export

export { stripe, isStripeConfigured } from './client';

export {
  PLANS,
  TRIAL_PERIOD_DAYS,
  WEBHOOK_EVENTS,
  getStripePriceId,
  getPlanConfig,
  isValidPlan,
  isValidBillingInterval,
  type PlanId,
  type BillingInterval,
  type PlanConfig,
  type WebhookEventType,
} from './config';

export {
  createStripeCustomer,
  getStripeCustomer,
  updateStripeCustomer,
  getPaymentMethods,
  getDefaultPaymentMethod,
  createSetupIntent,
  setDefaultPaymentMethod,
} from './customer';

export {
  createCheckoutSession,
  createCustomerPortalSession,
  getCheckoutSession,
} from './checkout';

export {
  getSubscription,
  getCustomerSubscriptions,
  cancelSubscriptionAtPeriodEnd,
  cancelSubscriptionImmediately,
  resumeSubscription,
  changeSubscriptionPlan,
  previewPlanChange,
  getUpcomingInvoice,
  getInvoices,
  mapStripeStatus,
  getSubscriptionPeriod,
} from './subscription';

export {
  constructWebhookEvent,
  extractSubscriptionFromEvent,
  logWebhookEvent,
} from './webhooks';
