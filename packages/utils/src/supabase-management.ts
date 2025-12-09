import { generateSecurePassword } from './crypto';

const SUPABASE_MANAGEMENT_API = 'https://api.supabase.com/v1';

interface SupabaseConfig {
  accessToken: string;
  organizationId: string;
}

function getConfig(): SupabaseConfig {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const organizationId = process.env.SUPABASE_ORG_ID;

  if (!accessToken || !organizationId) {
    throw new Error('SUPABASE_ACCESS_TOKEN and SUPABASE_ORG_ID must be set');
  }

  return { accessToken, organizationId };
}

export interface CreateProjectResponse {
  id: string;
  ref: string;
  name: string;
  organization_id: string;
  region: string;
  status: string;
}

export interface ProjectStatus {
  id: string;
  ref: string;
  name: string;
  status: 'COMING_UP' | 'ACTIVE_HEALTHY' | 'ACTIVE_UNHEALTHY' | 'INACTIVE' | 'UNKNOWN';
  region: string;
}

export interface ApiKey {
  name: string;
  api_key: string;
}

export interface TenantCredentials {
  projectId: string;
  projectRef: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseUrl: string;
  databasePassword: string;
}

export async function createSupabaseProject(
  name: string,
  region: string = 'ap-southeast-1'
): Promise<{ project: CreateProjectResponse; dbPassword: string }> {
  const config = getConfig();
  const dbPassword = generateSecurePassword(24);

  const response = await fetch(`${SUPABASE_MANAGEMENT_API}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      organization_id: config.organizationId,
      region,
      plan: 'free', // Can be 'free' or 'pro'
      db_pass: dbPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Supabase project: ${error}`);
  }

  const project = await response.json() as CreateProjectResponse;
  return { project, dbPassword };
}

export async function getProjectStatus(projectRef: string): Promise<ProjectStatus> {
  const config = getConfig();

  const response = await fetch(`${SUPABASE_MANAGEMENT_API}/projects/${projectRef}`, {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get project status: ${error}`);
  }

  return response.json() as Promise<ProjectStatus>;
}

export async function getProjectApiKeys(projectRef: string): Promise<ApiKey[]> {
  const config = getConfig();

  const response = await fetch(`${SUPABASE_MANAGEMENT_API}/projects/${projectRef}/api-keys`, {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get API keys: ${error}`);
  }

  return response.json() as Promise<ApiKey[]>;
}

export async function waitForProjectReady(
  projectRef: string,
  maxAttempts: number = 30,
  intervalMs: number = 10000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getProjectStatus(projectRef);

    if (status.status === 'ACTIVE_HEALTHY') {
      return true;
    }

    if (status.status === 'INACTIVE' || status.status === 'UNKNOWN') {
      throw new Error(`Project provisioning failed: ${status.status}`);
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Project provisioning timeout');
}

export async function getTenantCredentials(
  projectRef: string,
  dbPassword: string
): Promise<TenantCredentials> {
  const status = await getProjectStatus(projectRef);
  const keys = await getProjectApiKeys(projectRef);

  const anonKey = keys.find((k) => k.name === 'anon')?.api_key;
  const serviceRoleKey = keys.find((k) => k.name === 'service_role')?.api_key;

  if (!anonKey || !serviceRoleKey) {
    throw new Error('Failed to get API keys');
  }

  const supabaseUrl = `https://${projectRef}.supabase.co`;
  
  // Use Transaction Pooler URL for serverless environments (Next.js)
  // Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  // Note: We default to aws-0 as it's the standard, but some regions/projects might use aws-1.
  // Ideally this should be configurable or fetched from API if possible.
  const poolerHost = `aws-0-${status.region}.pooler.supabase.com`;
  
  // Transaction pooler requires username format: postgres.{projectRef}
  const databaseUrl = `postgresql://postgres.${projectRef}:${dbPassword}@${poolerHost}:6543/postgres?sslmode=require`;

  return {
    projectId: status.id,
    projectRef,
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    databaseUrl,
    databasePassword: dbPassword,
  };
}

export async function deleteProject(projectRef: string): Promise<void> {
  const config = getConfig();

  const response = await fetch(`${SUPABASE_MANAGEMENT_API}/projects/${projectRef}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete project: ${error}`);
  }
}
