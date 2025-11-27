import { pgTable, uuid, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tenants } from './tenants';

export const membershipRoleEnum = pgEnum('membership_role', ['owner', 'admin', 'member']);

export const tenantMemberships = pgTable('tenant_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  role: membershipRoleEnum('role').default('member').notNull(),
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at').defaultNow(),
  joinedAt: timestamp('joined_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type TenantMembership = typeof tenantMemberships.$inferSelect;
export type NewTenantMembership = typeof tenantMemberships.$inferInsert;
export type MembershipRole = (typeof membershipRoleEnum.enumValues)[number];
