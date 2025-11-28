/**
 * Pulumi Provisioning Module
 *
 * Uses Pulumi Automation API to provision tenant infrastructure on GCP.
 * This provides infrastructure-as-code approach for tenant provisioning.
 *
 * Prerequisites:
 * - PULUMI_ACCESS_TOKEN environment variable (or PULUMI_CONFIG_PASSPHRASE for local state)
 * - GCP_PROJECT_ID environment variable
 * - GCP_REGION environment variable (optional, defaults to us-central1)
 * - GCP credentials (GOOGLE_APPLICATION_CREDENTIALS or workload identity)
 */

import { LocalWorkspace, Stack, UpResult, DestroyResult } from '@pulumi/pulumi/automation';
import * as path from 'path';

export interface PulumiProvisioningConfig {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  region?: string;
  environment?: 'development' | 'staging' | 'production';
}

export interface GcpProvisioningResult {
  success: boolean;
  tenantId?: string;
  cloudSqlInstanceName?: string;
  cloudSqlConnectionName?: string;
  databaseUrl?: string;
  directDatabaseUrl?: string;
  databasePassword?: string;
  storageBucketName?: string;
  serviceAccountEmail?: string;
  serviceAccountKeyJson?: string;
  pulumiStackName?: string;
  error?: string;
}

export interface PulumiProvisioningResult extends GcpProvisioningResult {
  // Legacy fields for backwards compatibility
  projectId?: string;
  supabaseUrl?: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

// Re-export the legacy interface name
export { PulumiProvisioningResult as ProvisioningResult };

/**
 * Get the path to the Pulumi project
 */
function getPulumiProjectPath(): string {
  // The Pulumi project is in infrastructure/tenant-provisioner relative to the monorepo root
  // We need to find it relative to where this module is running
  const possiblePaths = [
    path.resolve(process.cwd(), 'infrastructure/tenant-provisioner'),
    path.resolve(__dirname, '../../../../infrastructure/tenant-provisioner'),
    path.resolve(__dirname, '../../../infrastructure/tenant-provisioner'),
  ];

  // In production, we'll use the first path that exists
  // For now, return the most likely path
  return possiblePaths[0];
}

/**
 * Create or select a Pulumi stack for a tenant
 */
async function getOrCreateStack(
  config: PulumiProvisioningConfig,
  environment: string
): Promise<Stack> {
  const stackName = `tenant-${config.tenantSlug}-${environment}`;
  const projectPath = getPulumiProjectPath();

  console.log(`[Pulumi] Using project path: ${projectPath}`);
  console.log(`[Pulumi] Stack name: ${stackName}`);

  try {
    // Try to select existing stack
    const stack = await LocalWorkspace.selectStack({
      stackName,
      workDir: projectPath,
    });
    console.log(`[Pulumi] Selected existing stack: ${stackName}`);
    return stack;
  } catch {
    // Stack doesn't exist, create it
    console.log(`[Pulumi] Creating new stack: ${stackName}`);
    const stack = await LocalWorkspace.createStack({
      stackName,
      workDir: projectPath,
    });
    return stack;
  }
}

/**
 * Configure the stack with tenant-specific values
 */
async function configureStack(
  stack: Stack,
  config: PulumiProvisioningConfig,
  environment: string
): Promise<void> {
  const gcpProjectId = process.env.GCP_PROJECT_ID;
  const gcpRegion = config.region || process.env.GCP_REGION || 'us-central1';

  if (!gcpProjectId) {
    throw new Error('GCP_PROJECT_ID environment variable is required');
  }

  // Set GCP config
  await stack.setConfig('gcp:project', { value: gcpProjectId });
  await stack.setConfig('gcp:region', { value: gcpRegion });

  // Set tenant config
  await stack.setConfig('tequity:tenantId', { value: config.tenantId });
  await stack.setConfig('tequity:environment', { value: environment });

  // Set environment-specific config
  if (environment === 'production') {
    await stack.setConfig('tequity:databaseTier', { value: 'db-custom-1-3840' });
    await stack.setConfig('tequity:enableBackups', { value: 'true' });
    await stack.setConfig('tequity:deletionProtection', { value: 'true' });
  } else {
    await stack.setConfig('tequity:databaseTier', { value: 'db-f1-micro' });
    await stack.setConfig('tequity:enableBackups', { value: 'false' });
    await stack.setConfig('tequity:deletionProtection', { value: 'false' });
  }
}

/**
 * Extract outputs from Pulumi up result
 */
function extractOutputs(upResult: UpResult): GcpProvisioningResult {
  const outputs = upResult.outputs;

  return {
    success: true,
    tenantId: outputs.tenantIdOutput?.value as string,
    cloudSqlInstanceName: outputs.cloudSqlInstanceName?.value as string,
    cloudSqlConnectionName: outputs.cloudSqlConnectionName?.value as string,
    databaseUrl: outputs.databaseUrlOutput?.value as string,
    directDatabaseUrl: outputs.directDatabaseUrlOutput?.value as string,
    databasePassword: outputs.databasePassword?.value as string,
    storageBucketName: outputs.storageBucketName?.value as string,
    serviceAccountEmail: outputs.serviceAccountEmail?.value as string,
    serviceAccountKeyJson: outputs.serviceAccountKeyJson?.value as string,
  };
}

/**
 * Provision a tenant's GCP infrastructure using Pulumi Automation API
 *
 * This function:
 * 1. Creates/selects a Pulumi stack for the tenant
 * 2. Configures the stack with tenant-specific values
 * 3. Runs `pulumi up` to create the infrastructure
 * 4. Returns the provisioned resource details
 */
export async function provisionWithPulumi(
  config: PulumiProvisioningConfig
): Promise<PulumiProvisioningResult> {
  // Check for required credentials
  const pulumiAccessToken = process.env.PULUMI_ACCESS_TOKEN;
  const pulumiPassphrase = process.env.PULUMI_CONFIG_PASSPHRASE;
  const gcpProjectId = process.env.GCP_PROJECT_ID;

  if (!pulumiAccessToken && !pulumiPassphrase) {
    return {
      success: false,
      error: 'Either PULUMI_ACCESS_TOKEN or PULUMI_CONFIG_PASSPHRASE is required',
    };
  }

  if (!gcpProjectId) {
    return {
      success: false,
      error: 'GCP_PROJECT_ID environment variable is required',
    };
  }

  const environment = config.environment || 'development';

  console.log(`[Pulumi] Starting GCP provisioning for tenant: ${config.tenantSlug}`);
  console.log(`[Pulumi] Environment: ${environment}`);
  console.log(`[Pulumi] GCP Project: ${gcpProjectId}`);

  try {
    // Get or create the stack
    const stack = await getOrCreateStack(config, environment);
    const stackName = stack.name;

    // Configure the stack
    await configureStack(stack, config, environment);

    // Run pulumi up
    console.log(`[Pulumi] Running 'pulumi up' for stack: ${stackName}`);
    const upResult = await stack.up({
      onOutput: (msg) => console.log(`[Pulumi] ${msg}`),
    });

    console.log(`[Pulumi] Provisioning completed successfully`);
    console.log(`[Pulumi] Summary: ${JSON.stringify(upResult.summary)}`);

    // Extract and return outputs
    const result = extractOutputs(upResult);
    result.pulumiStackName = stackName;

    return result;
  } catch (error) {
    console.error('[Pulumi] Provisioning failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during provisioning',
    };
  }
}

/**
 * Destroy a tenant's GCP infrastructure using Pulumi
 */
export async function destroyWithPulumi(
  tenantSlug: string,
  environment: string = 'development'
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Pulumi] Destroying infrastructure for tenant: ${tenantSlug}`);

  const stackName = `tenant-${tenantSlug}-${environment}`;
  const projectPath = getPulumiProjectPath();

  try {
    const stack = await LocalWorkspace.selectStack({
      stackName,
      workDir: projectPath,
    });

    console.log(`[Pulumi] Running 'pulumi destroy' for stack: ${stackName}`);
    const destroyResult: DestroyResult = await stack.destroy({
      onOutput: (msg) => console.log(`[Pulumi] ${msg}`),
    });

    console.log(`[Pulumi] Destroy completed: ${JSON.stringify(destroyResult.summary)}`);

    // Optionally remove the stack completely
    await stack.workspace.removeStack(stackName);
    console.log(`[Pulumi] Stack removed: ${stackName}`);

    return { success: true };
  } catch (error) {
    console.error('[Pulumi] Destroy failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during destroy',
    };
  }
}

/**
 * Get the status of a tenant's Pulumi stack
 */
export async function getPulumiStackStatus(
  tenantSlug: string,
  environment: string = 'development'
): Promise<'active' | 'provisioning' | 'failed' | 'not_found'> {
  const stackName = `tenant-${tenantSlug}-${environment}`;
  const projectPath = getPulumiProjectPath();

  try {
    const stack = await LocalWorkspace.selectStack({
      stackName,
      workDir: projectPath,
    });

    // Get stack info
    const info = await stack.info();

    if (!info) {
      return 'not_found';
    }

    // Check the last update result
    if (info.result === 'succeeded') {
      return 'active';
    } else if (info.result === 'in-progress') {
      return 'provisioning';
    } else {
      return 'failed';
    }
  } catch {
    return 'not_found';
  }
}

/**
 * Refresh stack state from the actual cloud resources
 */
export async function refreshPulumiStack(
  tenantSlug: string,
  environment: string = 'development'
): Promise<{ success: boolean; error?: string }> {
  const stackName = `tenant-${tenantSlug}-${environment}`;
  const projectPath = getPulumiProjectPath();

  try {
    const stack = await LocalWorkspace.selectStack({
      stackName,
      workDir: projectPath,
    });

    console.log(`[Pulumi] Refreshing stack: ${stackName}`);
    await stack.refresh({
      onOutput: (msg) => console.log(`[Pulumi] ${msg}`),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during refresh',
    };
  }
}

/**
 * Get stack outputs without running an update
 */
export async function getPulumiStackOutputs(
  tenantSlug: string,
  environment: string = 'development'
): Promise<GcpProvisioningResult> {
  const stackName = `tenant-${tenantSlug}-${environment}`;
  const projectPath = getPulumiProjectPath();

  try {
    const stack = await LocalWorkspace.selectStack({
      stackName,
      workDir: projectPath,
    });

    const outputs = await stack.outputs();

    return {
      success: true,
      tenantId: outputs.tenantIdOutput?.value as string,
      cloudSqlInstanceName: outputs.cloudSqlInstanceName?.value as string,
      cloudSqlConnectionName: outputs.cloudSqlConnectionName?.value as string,
      databaseUrl: outputs.databaseUrlOutput?.value as string,
      directDatabaseUrl: outputs.directDatabaseUrlOutput?.value as string,
      databasePassword: outputs.databasePassword?.value as string,
      storageBucketName: outputs.storageBucketName?.value as string,
      serviceAccountEmail: outputs.serviceAccountEmail?.value as string,
      serviceAccountKeyJson: outputs.serviceAccountKeyJson?.value as string,
      pulumiStackName: stackName,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Stack not found',
    };
  }
}
