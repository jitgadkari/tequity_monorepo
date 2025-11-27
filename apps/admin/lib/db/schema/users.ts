import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { customers } from './customers';

// User role enum - lowercase: "admin" | "general"
export const userRoleEnum = pgEnum('user_role', ['admin', 'general']);

// User status enum - matching frontend: "Active" | "Inactive" | "Pending"
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);

// Users table - Individual users belonging to customers
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: userRoleEnum('role').default('general').notNull(),
  status: userStatusEnum('status').default('pending').notNull(),
  avatar: varchar('avatar', { length: 10 }).notNull(), // User initials (e.g., "JD")
  lastActive: timestamp('last_active').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// TypeScript type inferred from schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
