// Master database connection for platform-wide operations
// (tenants, onboarding sessions, subscriptions, etc.)

// Import from the shared database package
import { prisma, getDb } from '@tequity/database';

// Re-export prisma client and helper
export { prisma, getDb };

// Export the getMasterDb function for backwards compatibility
export function getMasterDb() {
  return prisma;
}

// Re-export types for convenience
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
