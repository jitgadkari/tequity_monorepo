import { pgTable, uuid, varchar, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
]);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 100 }),
  stripePriceId: varchar('stripe_price_id', { length: 100 }),
  plan: varchar('plan', { length: 50 }).notNull(), // starter, professional, enterprise
  billing: varchar('billing', { length: 20 }).notNull(), // monthly, yearly
  status: subscriptionStatusEnum('status').default('trialing').notNull(),
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
