import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Customer status enum
export const customerStatusEnum = pgEnum('customer_status', ['active', 'inactive', 'pending']);

// Customers table - Companies using the SaaS platform
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  plan: varchar('plan', { length: 100 }).notNull(), // Will be FK later
  status: customerStatusEnum('status').default('pending').notNull(),
  lastActive: timestamp('last_active').defaultNow().notNull(),
  logo: varchar('logo', { length: 1 }).notNull(), // Single letter for avatar
  logoColor: varchar('logo_color', { length: 7 }).notNull(), // Hex color code
  ownerEmail: varchar('owner_email', { length: 255 }).notNull(), // For ownership transfer
  dbUrl: text('db_url').notNull(), // Database URL for customer's application
  slug: varchar('slug', { length: 255 }).notNull().unique(), // URL-friendly slug for customer app routing
  setupToken: varchar('setup_token', { length: 64 }).notNull().unique(), // Unique token for customer setup URL
  setupCompleted: timestamp('setup_completed'), // When customer completed their setup
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TypeScript type inferred from schema
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
