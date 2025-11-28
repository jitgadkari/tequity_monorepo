import { NextResponse } from 'next/server';
import { getProvisioningProviderStatus, getEffectiveProvisioningProvider } from '@/lib/feature-flags';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    duration_ms?: number;
  }[];
  provisioning?: {
    provider: string;
    configured: boolean;
    details?: Record<string, boolean>;
  };
}

/**
 * Health Check Endpoint
 *
 * Used by Kubernetes probes:
 * - /api/health - Full health check (readiness probe)
 * - /api/health?probe=liveness - Lightweight liveness check
 *
 * Returns:
 * - 200: Healthy
 * - 503: Unhealthy
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const probe = searchParams.get('probe');
  const includeDetails = searchParams.get('details') === 'true';

  // Liveness probe - just check if the process is running
  if (probe === 'liveness') {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }

  const checks: HealthStatus['checks'] = [];
  let overallStatus: HealthStatus['status'] = 'healthy';

  // Check 1: Environment variables
  const requiredEnvVars = ['MASTER_DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingEnvVars.length > 0) {
    checks.push({
      name: 'environment',
      status: 'fail',
      message: `Missing required env vars: ${missingEnvVars.join(', ')}`,
    });
    overallStatus = 'unhealthy';
  } else {
    checks.push({
      name: 'environment',
      status: 'pass',
      message: 'All required environment variables are set',
    });
  }

  // Check 2: Database connectivity (master database)
  const dbCheckStart = Date.now();
  try {
    // Dynamic import to avoid issues if database is not configured
    const { getMasterDb } = await import('@/lib/master-db');
    const db = getMasterDb();

    // Execute a simple query to verify connectivity
    await db.execute(new (await import('drizzle-orm')).sql`SELECT 1`);

    checks.push({
      name: 'database',
      status: 'pass',
      message: 'Master database connection successful',
      duration_ms: Date.now() - dbCheckStart,
    });
  } catch (error) {
    checks.push({
      name: 'database',
      status: 'fail',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration_ms: Date.now() - dbCheckStart,
    });
    overallStatus = 'unhealthy';
  }

  // Check 3: Provisioning provider status
  const providerStatus = getProvisioningProviderStatus();
  const effectiveProvider = getEffectiveProvisioningProvider();

  if (providerStatus.configured) {
    checks.push({
      name: 'provisioning',
      status: 'pass',
      message: `Provisioning provider '${providerStatus.provider}' is configured`,
    });
  } else if (effectiveProvider === 'mock') {
    checks.push({
      name: 'provisioning',
      status: 'warn',
      message: `Provisioning provider '${providerStatus.provider}' not configured, using mock mode`,
    });
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  } else {
    checks.push({
      name: 'provisioning',
      status: 'fail',
      message: `Provisioning provider '${providerStatus.provider}' is not properly configured`,
    });
    overallStatus = 'unhealthy';
  }

  // Check 4: Memory usage
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const heapUsagePercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

  if (heapUsagePercent > 90) {
    checks.push({
      name: 'memory',
      status: 'warn',
      message: `High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%)`,
    });
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  } else {
    checks.push({
      name: 'memory',
      status: 'pass',
      message: `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsagePercent}%)`,
    });
  }

  const response: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    checks,
  };

  // Include provisioning details if requested
  if (includeDetails) {
    response.provisioning = {
      provider: providerStatus.provider,
      configured: providerStatus.configured,
      details: providerStatus.details,
    };
  }

  // Return appropriate status code
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: statusCode });
}
