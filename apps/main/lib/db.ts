import { PrismaClient } from '@prisma/tenant-client'
import { getMasterDb } from './master-db'
import { decrypt } from '@tequity/utils'

// Cache for tenant Prisma clients
const tenantClients = new Map<string, PrismaClient>()

// Default PrismaClient singleton for Next.js
// Used for mock mode or fallback
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
 * Get tenant database credentials from master DB
 */
async function getTenantCredentials(tenantSlug: string): Promise<{
  databaseUrl: string
  isMock: boolean
} | null> {
  try {
    const db = getMasterDb()

    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      console.warn(`Tenant not found: ${tenantSlug}`)
      return null
    }

    // Check if using mock mode
    if (tenant.databaseUrlEncrypted === 'mock_encrypted_url' ||
        tenant.supabaseProjectId?.startsWith('mock_')) {
      console.log(`Using mock mode for tenant: ${tenantSlug}`)
      return {
        databaseUrl: process.env.DATABASE_URL || '',
        isMock: true,
      }
    }

    // Decrypt the real database URL
    if (!tenant.databaseUrlEncrypted) {
      console.warn(`No database URL for tenant: ${tenantSlug}`)
      return null
    }

    const databaseUrl = decrypt(tenant.databaseUrlEncrypted)
    return { databaseUrl, isMock: false }
  } catch (error) {
    console.error(`Error getting tenant credentials for ${tenantSlug}:`, error)
    return null
  }
}

/**
 * Get prisma client for a specific tenant
 * Returns a tenant-specific connection or the default connection in mock mode
 *
 * @param tenantSlug - The tenant identifier from URL (e.g., "acme-corp")
 * @returns PrismaClient instance connected to tenant's database
 */
export async function getTenantDb(tenantSlug: string): Promise<PrismaClient> {
  // Check if we already have a cached client for this tenant
  const cached = tenantClients.get(tenantSlug)
  if (cached) {
    return cached
  }

  // Get tenant credentials
  const credentials = await getTenantCredentials(tenantSlug)

  // Use default database if credentials not available or in mock mode
  if (!credentials || credentials.isMock) {
    return prisma
  }

  // Create new Prisma client for this tenant
  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: credentials.databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

  // Cache the client
  tenantClients.set(tenantSlug, tenantPrisma)

  return tenantPrisma
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
 * Clean up tenant connections on shutdown
 */
export async function disconnectTenants(): Promise<void> {
  const disconnectPromises = Array.from(tenantClients.values()).map(client =>
    client.$disconnect()
  )
  await Promise.all(disconnectPromises)
  tenantClients.clear()
}

export default prisma
