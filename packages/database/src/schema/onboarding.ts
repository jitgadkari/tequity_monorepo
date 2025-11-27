import { pgTable, uuid, varchar, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const tenantOnboarding = pgTable('tenant_onboarding', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),

  // Step completion tracking
  companyInfoCompleted: boolean('company_info_completed').default(false),
  teamInvitesCompleted: boolean('team_invites_completed').default(false),
  useCaseCompleted: boolean('use_case_completed').default(false),
  paymentCompleted: boolean('payment_completed').default(false),

  // Saved data
  companyData: jsonb('company_data').default('{}'),
  teamEmails: jsonb('team_emails').default('[]'),
  selectedPlan: varchar('selected_plan', { length: 50 }),
  selectedBilling: varchar('selected_billing', { length: 20 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type TenantOnboarding = typeof tenantOnboarding.$inferSelect;
export type NewTenantOnboarding = typeof tenantOnboarding.$inferInsert;
