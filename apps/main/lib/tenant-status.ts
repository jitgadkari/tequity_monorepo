/**
 * Tenant Status Cache
 *
 * Provides fast, cached tenant status lookups to validate
 * that tenants are active before allowing API access.
 *
 * Features:
 * - In-memory cache with 60-second TTL
 * - No external dependencies (Redis, etc.)
 * - Cache invalidation support for admin actions
 */

import { getMasterDb } from './master-db'

// In-memory cache: { slug: { status, expiresAt } }
const statusCache = new Map<string, { status: string; expiresAt: number }>()
const CACHE_TTL_MS = 60_000 // 60 seconds

/**
 * Get tenant status with caching
 * Returns null if tenant not found
 */
export async function getTenantStatus(tenantSlug: string): Promise<string | null> {
  const now = Date.now()
  const cached = statusCache.get(tenantSlug)

  // Return cached value if still valid
  if (cached && cached.expiresAt > now) {
    return cached.status
  }

  // Fetch from database
  const db = getMasterDb()
  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { status: true },
  })

  if (!tenant) {
    // Cache miss for non-existent tenant (prevent repeated lookups)
    statusCache.set(tenantSlug, {
      status: 'NOT_FOUND',
      expiresAt: now + CACHE_TTL_MS,
    })
    return null
  }

  // Cache the result
  statusCache.set(tenantSlug, {
    status: tenant.status,
    expiresAt: now + CACHE_TTL_MS,
  })

  return tenant.status
}

/**
 * Check if tenant is active (not suspended/cancelled)
 * Returns false for non-existent tenants
 */
export async function isTenantActive(tenantSlug: string): Promise<boolean> {
  const status = await getTenantStatus(tenantSlug)
  return status === 'ACTIVE'
}

/**
 * Invalidate cache for a specific tenant
 * Call this when admin changes tenant status
 */
export function invalidateTenantCache(tenantSlug: string): void {
  statusCache.delete(tenantSlug)
  console.log(`[TenantStatus] Cache invalidated for: ${tenantSlug}`)
}

/**
 * Clear entire tenant status cache
 * Useful for testing or emergency situations
 */
export function clearTenantCache(): void {
  statusCache.clear()
  console.log(`[TenantStatus] Cache cleared`)
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: statusCache.size,
    entries: Array.from(statusCache.keys()),
  }
}
