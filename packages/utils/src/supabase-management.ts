import { generateSecurePassword } from './crypto';

const SUPABASE_MANAGEMENT_API = 'https://api.supabase.com/v1';

interface SupabaseConfig {
  accessToken: string;
  organizationId: string;
}

function getConfig(): SupabaseConfig {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const organizationId = process.env.SUPABASE_ORG_ID;

  console.log(`[Supabase Config] SUPABASE_ACCESS_TOKEN: ${accessToken ? `set (${accessToken.length} chars, starts with ${accessToken.substring(0, 10)}...)` : 'NOT SET'}`);
  console.log(`[Supabase Config] SUPABASE_ORG_ID: ${organizationId || 'NOT SET'}`);

  if (!accessToken || !organizationId) {
    console.error(`[Supabase Config] ERROR: Missing required environment variables`);
    console.error(`[Supabase Config]   SUPABASE_ACCESS_TOKEN: ${accessToken ? 'set' : 'MISSING'}`);
    console.error(`[Supabase Config]   SUPABASE_ORG_ID: ${organizationId ? 'set' : 'MISSING'}`);
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
  databaseUrl: string;           // Transaction pooler URL (port 6543) - for runtime
  databaseUrlSession: string;    // Session pooler URL (port 5432) - for migrations
  databaseUrlDirect: string;     // Direct connection URL - most reliable for migrations
  databasePassword: string;
}

export async function createSupabaseProject(
  name: string,
  region: string = 'ap-southeast-1'
): Promise<{ project: CreateProjectResponse; dbPassword: string }> {
  const config = getConfig();
  const dbPassword = generateSecurePassword(24);

  console.log(`[Supabase API] Creating project: ${name}`);
  console.log(`[Supabase API] Organization ID: ${config.organizationId}`);
  console.log(`[Supabase API] Region: ${region}`);
  console.log(`[Supabase API] Access Token present: ${!!config.accessToken}, length: ${config.accessToken?.length || 0}`);

  const requestBody = {
    name,
    organization_id: config.organizationId,
    region,
    plan: 'free', // Can be 'free' or 'pro'
    db_pass: dbPassword,
  };

  console.log(`[Supabase API] Request body (without password):`, { ...requestBody, db_pass: '[REDACTED]' });

  const response = await fetch(`${SUPABASE_MANAGEMENT_API}/projects`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`[Supabase API] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Supabase API] ========== CREATE PROJECT FAILED ==========`);
    console.error(`[Supabase API] Status: ${response.status}`);
    console.error(`[Supabase API] Status Text: ${response.statusText}`);
    console.error(`[Supabase API] Response Body: ${errorText}`);
    console.error(`[Supabase API] =============================================`);
    throw new Error(`Failed to create Supabase project (${response.status}): ${errorText}`);
  }

  const project = await response.json() as CreateProjectResponse;
  console.log(`[Supabase API] Project created successfully: ${project.ref}`);
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

  // URL-encode the password to handle special characters like #, $, @, etc.
  const encodedPassword = encodeURIComponent(dbPassword);
  console.log(`[Supabase] Password contains special chars, URL-encoded for connection strings`);

  const supabaseUrl = `https://${projectRef}.supabase.co`;

  // Try to determine which AWS availability zone the pooler is on (aws-0 or aws-1)
  // We'll test the connection and return both options for fallback
  const poolerHostAws0 = `aws-0-${status.region}.pooler.supabase.com`;
  const poolerHostAws1 = `aws-1-${status.region}.pooler.supabase.com`;

  // Test which pooler host works by attempting a connection
  let workingPoolerHost = poolerHostAws0; // default to aws-0

  console.log(`[Supabase] Testing pooler connectivity...`);

  // Try aws-0 first
  try {
    const testUrl = `postgresql://postgres.${projectRef}:${encodedPassword}@${poolerHostAws0}:5432/postgres`;
    const { Client } = await import('pg');
    const client = new Client({ connectionString: testUrl, connectionTimeoutMillis: 5000 });
    await client.connect();
    await client.end();
    workingPoolerHost = poolerHostAws0;
    console.log(`[Supabase] ✓ aws-0 pooler works: ${poolerHostAws0}`);
  } catch (err0) {
    console.log(`[Supabase] ✗ aws-0 pooler failed, trying aws-1...`);
    // Try aws-1
    try {
      const testUrl = `postgresql://postgres.${projectRef}:${encodedPassword}@${poolerHostAws1}:5432/postgres`;
      const { Client } = await import('pg');
      const client = new Client({ connectionString: testUrl, connectionTimeoutMillis: 5000 });
      await client.connect();
      await client.end();
      workingPoolerHost = poolerHostAws1;
      console.log(`[Supabase] ✓ aws-1 pooler works: ${poolerHostAws1}`);
    } catch (err1) {
      console.log(`[Supabase] ✗ aws-1 pooler also failed, defaulting to aws-0`);
      console.log(`[Supabase] Note: Pooler may need time to propagate user, using direct connection for migrations`);
      workingPoolerHost = poolerHostAws0; // fallback to aws-0
    }
  }

  // Transaction pooler (port 6543) - for runtime use in serverless environments
  // Format: postgresql://postgres.{projectRef}:{password}@{poolerHost}:6543/postgres
  const databaseUrl = `postgresql://postgres.${projectRef}:${encodedPassword}@${workingPoolerHost}:6543/postgres`;

  // Session pooler (port 5432) - for connection pooling with session mode
  // Format: postgresql://postgres.{projectRef}:{password}@{poolerHost}:5432/postgres
  const databaseUrlSession = `postgresql://postgres.${projectRef}:${encodedPassword}@${workingPoolerHost}:5432/postgres`;

  // Direct database connection (bypasses pooler) - most reliable for migrations
  // Format: postgresql://postgres:{password}@db.{projectRef}.supabase.co:5432/postgres
  // Note: Direct connection uses 'postgres' username (not postgres.{projectRef})
  const databaseUrlDirect = `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`;

  console.log(`[Supabase] Generated database URLs for project: ${projectRef}`);
  console.log(`[Supabase]   Region: ${status.region}`);
  console.log(`[Supabase]   Working Pooler Host: ${workingPoolerHost}`);
  console.log(`[Supabase]   Transaction Pooler (6543): postgresql://postgres.${projectRef}:***@${workingPoolerHost}:6543/postgres`);
  console.log(`[Supabase]   Session Pooler (5432): postgresql://postgres.${projectRef}:***@${workingPoolerHost}:5432/postgres`);
  console.log(`[Supabase]   Direct Connection: postgresql://postgres:***@db.${projectRef}.supabase.co:5432/postgres`);

  return {
    projectId: status.id,
    projectRef,
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    databaseUrl,
    databaseUrlSession,
    databaseUrlDirect,
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
