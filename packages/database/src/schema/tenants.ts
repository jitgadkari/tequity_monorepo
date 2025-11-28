import { pgTable, uuid, varchar, timestamp, pgEnum, text, jsonb } from 'drizzle-orm/pg-core';

export const tenantStatusEnum = pgEnum('tenant_status', [
  'pending_onboarding',
  'pending_payment',
  'provisioning',
  'active',
  'suspended',
  'cancelled',
]);

export const provisioningProviderEnum = pgEnum('provisioning_provider', [
  'supabase',
  'gcp',
  'mock',
]);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  status: tenantStatusEnum('status').default('pending_onboarding').notNull(),

  // Provisioning provider tracking
  provisioningProvider: provisioningProviderEnum('provisioning_provider'),

  // Supabase project details (encrypted)
  supabaseProjectId: varchar('supabase_project_id', { length: 100 }),
  supabaseProjectRef: varchar('supabase_project_ref', { length: 100 }),
  databaseUrlEncrypted: text('database_url_encrypted'), // AES-256 encrypted

  // GCP Cloud SQL details
  gcpProjectId: varchar('gcp_project_id', { length: 100 }),
  gcpRegion: varchar('gcp_region', { length: 50 }),
  cloudSqlInstanceName: varchar('cloud_sql_instance_name', { length: 100 }),
  cloudSqlConnectionName: varchar('cloud_sql_connection_name', { length: 200 }),
  gcpDatabaseUrlEncrypted: text('gcp_database_url_encrypted'), // AES-256 encrypted

  // GCP Storage details
  storageBucketName: varchar('storage_bucket_name', { length: 100 }),

  // GCP Service Account details (encrypted)
  serviceAccountEmail: varchar('service_account_email', { length: 200 }),
  serviceAccountKeyEncrypted: text('service_account_key_encrypted'), // AES-256 encrypted JSON key

  // Pulumi stack tracking
  pulumiStackName: varchar('pulumi_stack_name', { length: 100 }),

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
export type ProvisioningProvider = (typeof provisioningProviderEnum.enumValues)[number];
