import { stripe } from './client';
import type Stripe from 'stripe';

export interface CreateCustomerParams {
  email: string;
  name?: string;
  tenantId: string;
  tenantName: string;
}

/**
 * Create a Stripe customer for a tenant
 */
export async function createStripeCustomer({
  email,
  name,
  tenantId,
  tenantName,
}: CreateCustomerParams): Promise<Stripe.Customer> {
  const customer = await stripe.customers.create({
    email,
    name: name || tenantName,
    metadata: {
      tenantId,
      tenantName,
    },
  });

  return customer;
}

/**
 * Get a Stripe customer by ID
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }
    return customer as Stripe.Customer;
  } catch {
    return null;
  }
}

/**
 * Update a Stripe customer
 */
export async function updateStripeCustomer(
  customerId: string,
  params: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, params);
}

/**
 * Get customer's payment methods
 */
export async function getPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  return paymentMethods.data;
}

/**
 * Get customer's default payment method
 */
export async function getDefaultPaymentMethod(
  customerId: string
): Promise<Stripe.PaymentMethod | null> {
  const customer = await getStripeCustomer(customerId);
  if (!customer || !customer.invoice_settings.default_payment_method) {
    return null;
  }

  const paymentMethodId = customer.invoice_settings.default_payment_method;
  if (typeof paymentMethodId === 'string') {
    return stripe.paymentMethods.retrieve(paymentMethodId);
  }
  return paymentMethodId;
}

/**
 * Create a setup intent for adding a new payment method
 */
export async function createSetupIntent(
  customerId: string
): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
  });
}

/**
 * Set the default payment method for a customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}
