// Tenant status types
export type TenantStatus =
  | 'pending_onboarding'
  | 'pending_payment'
  | 'provisioning'
  | 'active'
  | 'suspended'
  | 'cancelled';

// Onboarding types
export interface CompanyData {
  name: string;
  size: string;
  industry: string;
}

export interface OnboardingStatus {
  companyInfoCompleted: boolean;
  teamInvitesCompleted: boolean;
  useCaseCompleted: boolean;
  paymentCompleted: boolean;
  currentStep: 'company' | 'team' | 'use-case' | 'pricing' | 'complete';
}

// Provisioning types
export type ProvisioningStatus =
  | 'pending'
  | 'creating_project'
  | 'waiting_for_ready'
  | 'running_migrations'
  | 'seeding_data'
  | 'completed'
  | 'failed';

export interface ProvisioningProgress {
  status: ProvisioningStatus;
  progress: number; // 0-100
  message: string;
  error?: string;
}

// API request/response types
export interface CreateTenantRequest {
  name: string;
  companySize: string;
  industry: string;
}

export interface SelectPlanRequest {
  plan: 'starter' | 'professional' | 'enterprise';
  billing: 'monthly' | 'yearly';
}
