import { relations } from 'drizzle-orm';
import { users } from './users';
import { tenants } from './tenants';
import { tenantMemberships } from './memberships';
import { subscriptions } from './subscriptions';
import { verificationTokens } from './tokens';
import { tenantOnboarding } from './onboarding';

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(tenantMemberships),
  verificationTokens: many(verificationTokens),
  onboardingFlows: many(tenantOnboarding),
}));

// Tenant relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  memberships: many(tenantMemberships),
  subscriptions: many(subscriptions),
}));

// Tenant membership relations
export const tenantMembershipsRelations = relations(tenantMemberships, ({ one }) => ({
  user: one(users, {
    fields: [tenantMemberships.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [tenantMemberships.tenantId],
    references: [tenants.id],
  }),
  inviter: one(users, {
    fields: [tenantMemberships.invitedBy],
    references: [users.id],
    relationName: 'inviter',
  }),
}));

// Subscription relations
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenantId],
    references: [tenants.id],
  }),
}));

// Token relations
export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [verificationTokens.userId],
    references: [users.id],
  }),
}));

// Onboarding relations
export const tenantOnboardingRelations = relations(tenantOnboarding, ({ one }) => ({
  user: one(users, {
    fields: [tenantOnboarding.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [tenantOnboarding.tenantId],
    references: [tenants.id],
  }),
}));
