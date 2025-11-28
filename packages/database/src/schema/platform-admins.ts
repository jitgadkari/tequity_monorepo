import { pgTable, uuid, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Platform admin role enum
export const platformAdminRoleEnum = pgEnum('platform_admin_role', ['super_admin', 'admin']);

// Platform admin status enum
export const platformAdminStatusEnum = pgEnum('platform_admin_status', ['active', 'inactive']);

// Platform admins table - users who can manage the entire SaaS platform
export const platformAdmins = pgTable('platform_admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(), // Hashed with bcrypt
  name: varchar('name', { length: 255 }).notNull(),
  role: platformAdminRoleEnum('role').default('admin').notNull(),
  status: platformAdminStatusEnum('status').default('active').notNull(),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type PlatformAdmin = typeof platformAdmins.$inferSelect;
export type NewPlatformAdmin = typeof platformAdmins.$inferInsert;
