import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  service: string;
  checks: {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message?: string;
    duration_ms?: number;
  }[];
}

/**
 * Health Check Endpoint for Admin App
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

  // Liveness probe - just check if the process is running
  if (probe === 'liveness') {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'admin',
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

  // Check 2: Database connectivity (master database via Prisma)
  const dbCheckStart = Date.now();
  try {
    // Dynamic import to avoid issues if database is not configured
    const { db } = await import('@/lib/db');

    // Execute a simple query to verify connectivity using Prisma's $queryRaw
    await db.$queryRaw`SELECT 1`;

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

  // Check 3: Memory usage
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
    service: 'admin',
    checks,
  };

  // Return appropriate status code
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: statusCode });
}
