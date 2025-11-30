import type { OnboardingStage } from '@tequity/database';

/**
 * Get the redirect URL based on the current onboarding stage.
 * This enables resumable flow - tenant can close browser and continue later.
 */
export function getRedirectForStage(
  stage: OnboardingStage | string,
  tenantSlug?: string
): string {
  switch (stage) {
    case 'SIGNUP_STARTED':
      return '/verify-email';

    case 'EMAIL_VERIFIED':
    case 'DATAROOM_CREATED':
    case 'USE_CASE_SELECTED':
    case 'WORKFLOW_SETUP':
      return '/workspace-setup';

    case 'USERS_INVITED':
    case 'PLAN_SELECTED':
    case 'PAYMENT_PENDING':
      return '/pricing';

    case 'PAYMENT_COMPLETED':
    case 'PROVISIONING':
      return '/provisioning';

    case 'ACTIVE':
      return tenantSlug ? `/${tenantSlug}/Dashboard/Library` : '/workspace-setup';

    default:
      return '/workspace-setup';
  }
}

/**
 * Get the current step number within workspace-setup based on stage.
 * Used by the workspace-setup UI to show progress and navigate.
 */
export function getWorkspaceSetupStep(stage: OnboardingStage | string): number {
  switch (stage) {
    case 'EMAIL_VERIFIED':
      return 1; // Step 1: Enter dataroom name
    case 'DATAROOM_CREATED':
      return 2; // Step 2: Select use case
    case 'USE_CASE_SELECTED':
      return 3; // Step 3: Configure workflow
    case 'WORKFLOW_SETUP':
      return 4; // Step 4: Invite team members
    case 'USERS_INVITED':
      return 5; // Completed workspace setup, go to pricing
    default:
      return 1;
  }
}

/**
 * Check if a stage is before another stage in the onboarding flow.
 * Useful for determining if tenant can access a certain page.
 */
export function isStageBeforeOrEqual(
  currentStage: OnboardingStage | string,
  targetStage: OnboardingStage | string
): boolean {
  const stageOrder: OnboardingStage[] = [
    'SIGNUP_STARTED',
    'EMAIL_VERIFIED',
    'DATAROOM_CREATED',
    'USE_CASE_SELECTED',
    'WORKFLOW_SETUP',
    'USERS_INVITED',
    'PLAN_SELECTED',
    'PAYMENT_PENDING',
    'PAYMENT_COMPLETED',
    'PROVISIONING',
    'ACTIVE',
  ];

  const currentIndex = stageOrder.indexOf(currentStage as OnboardingStage);
  const targetIndex = stageOrder.indexOf(targetStage as OnboardingStage);

  return currentIndex <= targetIndex;
}

/**
 * Get the next stage after the current one.
 */
export function getNextStage(currentStage: OnboardingStage | string): OnboardingStage | null {
  const stageOrder: OnboardingStage[] = [
    'SIGNUP_STARTED',
    'EMAIL_VERIFIED',
    'DATAROOM_CREATED',
    'USE_CASE_SELECTED',
    'WORKFLOW_SETUP',
    'USERS_INVITED',
    'PLAN_SELECTED',
    'PAYMENT_PENDING',
    'PAYMENT_COMPLETED',
    'PROVISIONING',
    'ACTIVE',
  ];

  const currentIndex = stageOrder.indexOf(currentStage as OnboardingStage);
  if (currentIndex === -1 || currentIndex === stageOrder.length - 1) {
    return null;
  }

  return stageOrder[currentIndex + 1];
}
