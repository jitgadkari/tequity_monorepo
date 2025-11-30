// Main entry point for @tequity/database package
// Exports Prisma client and types for master database

export { prisma, getDb, disconnectDb, PrismaClient } from './client';
export type { Prisma } from './client';

// Re-export all Prisma generated types from master client
export type {
  Tenant,
  OnboardingSession,
  PendingInvite,
  Subscription,
  VerificationToken,
  PlatformAdmin,
  OnboardingStage,
  TenantStatus,
  MembershipRole,
  InviteStatus,
  ProvisioningProvider,
  TokenPurpose,
  SubscriptionStatus,
  AdminRole,
  AdminStatus,
} from '@prisma/master-client';
