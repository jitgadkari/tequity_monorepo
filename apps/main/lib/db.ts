import { PrismaClient } from '@prisma/client'

// PrismaClient singleton for Next.js
// Prevents multiple instances in development due to hot reloading

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

/**
 * Get prisma client for a specific tenant
 * Currently uses single DATABASE_URL from env
 * Tenant slug from URL is used to filter/scope data
 *
 * @param tenantSlug - The tenant identifier from URL (e.g., "acme-corp")
 * @returns PrismaClient instance
 */
export async function getTenantDb(tenantSlug: string): Promise<PrismaClient> {
  // For now, we use the same database and filter by tenantSlug
  // The tenantSlug is extracted from the URL path
  // All queries should include tenantSlug in their where clause

  // Optionally validate tenant exists (can be cached)
  // For performance, you may want to skip this in production
  // and rely on the unique constraint to catch invalid tenants

  return prisma
}

/**
 * Validate that a tenant slug format is valid
 * Does not check database - just format validation
 */
export function isValidTenantSlug(slug: string): boolean {
  // Slug must be lowercase alphanumeric with hyphens
  // Between 2-50 characters
  const slugRegex = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/
  return slugRegex.test(slug) || (slug.length >= 2 && /^[a-z0-9]+$/.test(slug))
}

/**
 * Get or create a tenant by slug
 */
export async function getOrCreateTenant(slug: string, name?: string) {
  const existing = await prisma.tenant.findUnique({
    where: { slug }
  })

  if (existing) {
    return existing
  }

  // Create new tenant
  return prisma.tenant.create({
    data: {
      slug,
      name: name || slug,
      isActive: true,
    }
  })
}

/**
 * Check if tenant exists and is active
 */
export async function isTenantActive(slug: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { isActive: true }
  })

  return tenant?.isActive ?? false
}

export default prisma
