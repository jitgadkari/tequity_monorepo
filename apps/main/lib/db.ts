import { getMasterDb } from "./master-db";
import { decrypt } from "@tequity/utils";

// Try to import tenant client, fall back to master client if it doesn't exist
let PrismaClient: any;
try {
  // Try to import from @prisma/tenant-client (for multi-tenant setup)
  PrismaClient = require("@prisma/tenant-client").PrismaClient;
} catch {
  // Fall back to master client in development/mock mode
  PrismaClient = require("@prisma/master-client").PrismaClient;
}

// Cache for tenant Prisma clients
const tenantClients = new Map<string, any>();

// Default PrismaClient singleton for Next.js
// Used for mock mode or fallback
const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Get tenant database credentials from master DB
 */
async function getTenantCredentials(tenantSlug: string): Promise<{
  databaseUrl: string;
  isMock: boolean;
} | null> {
  try {
    console.log(`[TenantDB] ========================================`);
    console.log(`[TenantDB] Getting credentials for tenant: ${tenantSlug}`);
    console.log(`[TenantDB] Step 1: Connecting to master database`);
    const db = getMasterDb();
    console.log(`[TenantDB] Step 2: Master DB connection obtained, querying tenant table`);

    console.log(`[TenantDB] Step 3: Executing findUnique query on master DB`);
    const tenant = await db.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        slug: true,
        status: true,
        databaseUrlEncrypted: true,
        supabaseProjectId: true,
        provisioningProvider: true,
      },
    });
    console.log(`[TenantDB] Step 4: Master DB query completed`);

    console.log(
      `[TenantDB] Tenant lookup result:`,
      tenant
        ? {
            id: tenant.id,
            slug: tenant.slug,
            status: tenant.status,
            provider: tenant.provisioningProvider,
            hasDbUrl: !!tenant.databaseUrlEncrypted,
            dbUrlLength: tenant.databaseUrlEncrypted?.length || 0,
            supabaseProjectId: tenant.supabaseProjectId,
          }
        : "null"
    );

    if (!tenant) {
      console.warn(`[TenantDB] ❌ Tenant not found in master DB: ${tenantSlug}`);
      console.log(`[TenantDB] ========================================`);
      return null;
    }

    // Check if using mock mode
    if (
      tenant.databaseUrlEncrypted === "mock_encrypted_url" ||
      tenant.supabaseProjectId?.startsWith("mock_")
    ) {
      console.log(`[TenantDB] ✓ Using mock mode for tenant: ${tenantSlug}`);
      console.log(`[TenantDB] ========================================`);
      return {
        databaseUrl: process.env.DATABASE_URL || "",
        isMock: true,
      };
    }

    // Decrypt the real database URL
    if (!tenant.databaseUrlEncrypted) {
      console.warn(`[TenantDB] ❌ No database URL for tenant: ${tenantSlug}`);
      console.log(`[TenantDB] ========================================`);
      return null;
    }

    console.log(`[TenantDB] Step 5: Decrypting database URL for tenant: ${tenantSlug}`);
    console.log(`[TenantDB] Encrypted URL length: ${tenant.databaseUrlEncrypted.length} characters`);
    const databaseUrl = decrypt(tenant.databaseUrlEncrypted);
    console.log(`[TenantDB] Step 6: Decryption successful`);

    // Log URL format (redacted for security) to help debug connection issues
    const urlParts = databaseUrl.split("@");
    const protocol = databaseUrl.split("://")[0] || "unknown";
    const hostPart = urlParts[1]?.split("/")[0] || "unknown";
    const dbPart = urlParts[1]?.split("/")[1]?.split("?")[0] || "unknown";
    const queryParams = urlParts[1]?.split("?")[1] || "none";
    
    console.log(`[TenantDB] ========================================`);
    console.log(`[TenantDB] Decrypted Connection Details:`);
    console.log(`[TenantDB]   Protocol: ${protocol}`);
    console.log(`[TenantDB]   Host: ${hostPart}`);
    console.log(`[TenantDB]   Database: ${dbPart}`);
    console.log(`[TenantDB]   Query Params: ${queryParams}`);
    console.log(`[TenantDB]   Full URL Length: ${databaseUrl.length} characters`);
    console.log(`[TenantDB] ========================================`);

    return { databaseUrl, isMock: false };
  } catch (error) {
    console.error(
      `[TenantDB] ❌ Error getting tenant credentials for ${tenantSlug}:`,
      error
    );
    console.log(`[TenantDB] ========================================`);
    return null;
  }
}

/**
 * Get prisma client for a specific tenant
 * Returns a tenant-specific connection or the default connection in mock mode
 *
 * @param tenantSlug - The tenant identifier from URL (e.g., "acme-corp")
 * @returns PrismaClient instance connected to tenant's database
 */
export async function getTenantDb(tenantSlug: string): Promise<any> {
  console.log(`[TenantDB] ========================================`);
  console.log(`[TenantDB] getTenantDb() called for: ${tenantSlug}`);
  console.log(`[TenantDB] Timestamp: ${new Date().toISOString()}`);

  // Check if we already have a cached client for this tenant
  const cached = tenantClients.get(tenantSlug);
  if (cached) {
    console.log(`[TenantDB] ✓ Using cached client for: ${tenantSlug}`);
    console.log(`[TenantDB] ========================================`);
    return cached;
  }

  // Get tenant credentials
  console.log(
    `[TenantDB] No cached client, fetching credentials for: ${tenantSlug}`
  );
  const credentials = await getTenantCredentials(tenantSlug);

  // Use default database if credentials not available or in mock mode
  if (!credentials) {
    console.log(
      `[TenantDB] No credentials found for ${tenantSlug}, using default prisma client`
    );
    return prisma;
  }

  if (credentials.isMock) {
    console.log(
      `[TenantDB] Mock mode for ${tenantSlug}, using default prisma client`
    );
    return prisma;
  }

  // Create new Prisma client for this tenant
  console.log(`[TenantDB] Step 7: Creating new Prisma client for: ${tenantSlug}`);
  try {
    const tenantPrisma = new PrismaClient({
      datasources: {
        db: {
          url: credentials.databaseUrl,
        },
      },
      log:
        process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    console.log(`[TenantDB] Step 8: Prisma client instance created`);

    // Test the connection by running a simple query
    console.log(`[TenantDB] Step 9: Testing connection for: ${tenantSlug}`);
    await tenantPrisma.$connect();
    console.log(`[TenantDB] Step 10: ✓ Connection successful for: ${tenantSlug}`);

    // Cache the client
    console.log(`[TenantDB] Step 11: Caching client for future use`);
    tenantClients.set(tenantSlug, tenantPrisma);
    console.log(`[TenantDB] ✓ Tenant DB setup complete for: ${tenantSlug}`);
    console.log(`[TenantDB] ========================================`);

    return tenantPrisma;
  } catch (error) {
    console.error(
      `[TenantDB] ❌ Failed to connect to tenant database ${tenantSlug}:`,
      error
    );
    console.log(`[TenantDB] ========================================`);
    throw error;
  }
}

/**
 * Validate that a tenant slug format is valid
 * Does not check database - just format validation
 */
export function isValidTenantSlug(slug: string): boolean {
  // Slug must be lowercase alphanumeric with hyphens and underscores
  // Between 2-50 characters
  // The nanoid suffix in generateSlug can include underscores
  const slugRegex = /^[a-z0-9][a-z0-9_-]{0,48}[a-z0-9]$/;
  return (
    slugRegex.test(slug) || (slug.length >= 2 && /^[a-z0-9_]+$/.test(slug))
  );
}

/**
 * Clean up tenant connections on shutdown
 */
export async function disconnectTenants(): Promise<void> {
  const disconnectPromises = Array.from(tenantClients.values()).map((client) =>
    client.$disconnect()
  );
  await Promise.all(disconnectPromises);
  tenantClients.clear();
}

export default prisma;
