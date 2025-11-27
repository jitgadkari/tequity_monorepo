import { pgTable, uuid, varchar, timestamp, decimal, pgEnum } from 'drizzle-orm/pg-core';
import { customers } from './customers';

// Subscription status enum
export const subscriptionStatusEnum = pgEnum('subscription_status', ['paid', 'pending', 'upcoming']);

// Subscriptions/Payments table - for manual payment tracking
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp('due_date').notNull(),
  paymentDate: timestamp('payment_date'),
  description: varchar('description', { length: 500 }).notNull(),
  status: subscriptionStatusEnum('status').default('upcoming').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
