import { prisma } from '@tequity/database';

// Shared database connection with main app (master database)
// Uses Prisma client from @tequity/database package

export const db = prisma;

// Re-export types for use in queries
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
} from '@tequity/database';
