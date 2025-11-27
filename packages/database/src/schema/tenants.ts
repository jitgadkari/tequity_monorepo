import { pgTable, uuid, varchar, timestamp, pgEnum, text, jsonb } from 'drizzle-orm/pg-core';

export const tenantStatusEnum = pgEnum('tenant_status', [
  'pending_onboarding',
  'pending_payment',
  'provisioning',
  'active',
  'suspended',
  'cancelled',
]);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  status: tenantStatusEnum('status').default('pending_onboarding').notNull(),

  // Supabase project details (encrypted)
  supabaseProjectId: varchar('supabase_project_id', { length: 100 }),
  supabaseProjectRef: varchar('supabase_project_ref', { length: 100 }),
  databaseUrlEncrypted: text('database_url_encrypted'), // AES-256 encrypted

  // Onboarding data
  useCase: varchar('use_case', { length: 50 }), // investor, single_firm
  companySize: varchar('company_size', { length: 50 }),
  industry: varchar('industry', { length: 100 }),

  settings: jsonb('settings').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantStatus = (typeof tenantStatusEnum.enumValues)[number];
