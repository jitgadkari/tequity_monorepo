/**
 * Feature Flags Configuration
 *
 * Controls various features and providers in the application.
 * Can be configured via environment variables.
 */

// Database Provisioning Provider
export type ProvisioningProvider = 'supabase' | 'pulumi' | 'mock';

export const featureFlags = {
  /**
   * Database Provisioning Provider
   *
   * Options:
   * - 'supabase': Use Supabase Management API to create projects
   * - 'pulumi': Use Pulumi to provision infrastructure
   * - 'mock': Mock provisioning (for development/testing)
   *
   * Set via: PROVISIONING_PROVIDER env variable
   * Default: 'mock' (safe default for development)
   */
  provisioningProvider: (process.env.PROVISIONING_PROVIDER || 'mock') as ProvisioningProvider,

  /**
   * Email Sending
   *
   * Options:
   * - 'resend': Use Resend API
   * - 'sendgrid': Use SendGrid API
   * - 'mock': Mock email sending (logs to console)
   *
   * Set via: EMAIL_PROVIDER env variable
   * Default: 'mock'
   */
  emailProvider: (process.env.EMAIL_PROVIDER || 'mock') as 'resend' | 'sendgrid' | 'mock',

  /**
   * Enable/disable specific features
   */
  features: {
    // Team invitations during onboarding
    teamInvites: process.env.FEATURE_TEAM_INVITES !== 'false',

    // AI-powered features
    aiChat: process.env.FEATURE_AI_CHAT !== 'false',

    // File processing and embeddings
    fileProcessing: process.env.FEATURE_FILE_PROCESSING !== 'false',
  },
};

/**
 * Check if a specific provisioning provider is configured and has required credentials
 */
export function isProvisioningProviderConfigured(provider: ProvisioningProvider): boolean {
  switch (provider) {
    case 'supabase':
      return !!(process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_ORG_ID);
    case 'pulumi':
      // Pulumi/GCP requires either Pulumi Cloud token or local passphrase,
      // plus GCP project ID and credentials
      const hasPulumiAuth = !!(process.env.PULUMI_ACCESS_TOKEN || process.env.PULUMI_CONFIG_PASSPHRASE);
      const hasGcpConfig = !!(process.env.GCP_PROJECT_ID);
      // GCP credentials can be either via GOOGLE_APPLICATION_CREDENTIALS file
      // or via Workload Identity (in GKE environment)
      const hasGcpCredentials = !!(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_CLOUD_PROJECT || // Indicates Workload Identity
        process.env.K_SERVICE // Indicates Cloud Run/GKE environment
      );
      return hasPulumiAuth && hasGcpConfig && (hasGcpCredentials || isRunningInGke());
    case 'mock':
      return true;
    default:
      return false;
  }
}

/**
 * Check if running in GKE environment (Workload Identity provides credentials)
 */
function isRunningInGke(): boolean {
  // GKE sets specific environment variables and metadata service is available
  return !!(
    process.env.KUBERNETES_SERVICE_HOST ||
    process.env.K8S_POD_NAME ||
    process.env.HOSTNAME?.includes('gke-')
  );
}

/**
 * Get detailed provisioning provider status for debugging
 */
export function getProvisioningProviderStatus(): {
  provider: ProvisioningProvider;
  configured: boolean;
  details: Record<string, boolean>;
} {
  const provider = featureFlags.provisioningProvider;

  const details: Record<string, boolean> = {};

  switch (provider) {
    case 'supabase':
      details['SUPABASE_ACCESS_TOKEN'] = !!process.env.SUPABASE_ACCESS_TOKEN;
      details['SUPABASE_ORG_ID'] = !!process.env.SUPABASE_ORG_ID;
      break;
    case 'pulumi':
      details['PULUMI_ACCESS_TOKEN'] = !!process.env.PULUMI_ACCESS_TOKEN;
      details['PULUMI_CONFIG_PASSPHRASE'] = !!process.env.PULUMI_CONFIG_PASSPHRASE;
      details['GCP_PROJECT_ID'] = !!process.env.GCP_PROJECT_ID;
      details['GCP_REGION'] = !!process.env.GCP_REGION;
      details['GOOGLE_APPLICATION_CREDENTIALS'] = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
      details['runningInGke'] = isRunningInGke();
      break;
    case 'mock':
      details['alwaysAvailable'] = true;
      break;
  }

  return {
    provider,
    configured: isProvisioningProviderConfigured(provider),
    details,
  };
}

/**
 * Get the effective provisioning provider
 * Falls back to 'mock' if configured provider lacks credentials
 */
export function getEffectiveProvisioningProvider(): ProvisioningProvider {
  const configured = featureFlags.provisioningProvider;

  if (isProvisioningProviderConfigured(configured)) {
    return configured;
  }

  console.warn(
    `Provisioning provider '${configured}' is not properly configured. ` +
    `Falling back to 'mock' mode.`
  );

  return 'mock';
}

/**
 * Log current feature flag configuration (for debugging)
 */
export function logFeatureFlags(): void {
  console.log('=== Feature Flags Configuration ===');
  console.log(`Provisioning Provider: ${featureFlags.provisioningProvider}`);
  console.log(`Effective Provider: ${getEffectiveProvisioningProvider()}`);
  console.log(`Email Provider: ${featureFlags.emailProvider}`);
  console.log('Features:', featureFlags.features);
  console.log('===================================');
}
