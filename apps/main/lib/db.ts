import { getMasterDb } from "./master-db";
import { decrypt } from "@tequity/utils";

// Try to import tenant client, fall back to master client if it doesn't exist
let TenantPrismaClient: any;
let MasterPrismaClient: any;
let usingTenantClient = false;

try {
  // Try to import from @prisma/tenant-client (for multi-tenant setup)
  TenantPrismaClient = require("@prisma/tenant-client").PrismaClient;
  usingTenantClient = true;
  console.log(`[DB] Successfully loaded @prisma/tenant-client`);
} catch (e) {
  // Fall back to master client in development/mock mode
  console.log(`[DB] @prisma/tenant-client not available, will use master-client for fallback`);
  TenantPrismaClient = null;
}

try {
  MasterPrismaClient = require("@prisma/master-client").PrismaClient;
  console.log(`[DB] Successfully loaded @prisma/master-client`);
} catch (e) {
  console.log(`[DB] @prisma/master-client not available`);
  MasterPrismaClient = null;
}

// Use tenant client if available, otherwise master
const PrismaClient = TenantPrismaClient || MasterPrismaClient;

// Cache for tenant Prisma clients
const tenantClients = new Map<string, any>();

// Default PrismaClient singleton for Next.js
// Used for mock mode or fallback
const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined;
};

if (!globalForPrisma.prisma && PrismaClient) {
  console.log(`[DB] Creating default prisma client singleton`);
  console.log(`[DB] Using client type: ${usingTenantClient ? 'tenant-client' : 'master-client'}`);
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  // Log available models
  const modelNames = Object.keys(globalForPrisma.prisma).filter(
    (k) => !k.startsWith("_") && !k.startsWith("$") && typeof globalForPrisma.prisma[k] === "object"
  );
  console.log(`[DB] Available models in default prisma: ${modelNames.join(", ") || "none"}`);
}

export const prisma = globalForPrisma.prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Create a mock tenant client for development/testing
 * This allows the app to work without a real tenant database
 */
function createMockTenantClient(tenantSlug: string) {
  console.log(`[MockClient] Creating mock client for tenant: ${tenantSlug}`);

  // Generate a deterministic mock user ID based on tenant slug
  const mockUserId = `mock-user-${tenantSlug}`;
  const mockDataroomId = `mock-dataroom-${tenantSlug}`;

  // Mock user data
  const mockUser = {
    id: mockUserId,
    tenantSlug,
    email: `owner@${tenantSlug}.mock`,
    fullName: 'Mock User',
    role: 'owner',
    isActive: true,
    emailVerified: true,
    avatarUrl: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    // Related data for /auth/me endpoint
    settings: null,
    subscription: null,
    memberships: [],
    ownedDatarooms: [
      {
        id: mockDataroomId,
        name: 'Mock Dataroom',
      },
    ],
  };

  // Mock dataroom data
  const mockDataroom = {
    id: mockDataroomId,
    tenantSlug,
    name: 'Mock Dataroom',
    description: 'Mock dataroom for testing',
    ownerId: mockUserId,
    useCase: 'single-firm',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Create mock client object
  const mockClient = {
    // Mock user model
    user: {
      findFirst: async (args: any) => {
        console.log(`[MockClient] user.findFirst called with:`, args?.where);
        // Match by email if provided, otherwise return mock user
        if (args?.where?.email) {
          return {
            ...mockUser,
            email: args.where.email,
          };
        }
        return mockUser;
      },
      findUnique: async (args: any) => {
        console.log(`[MockClient] user.findUnique called with:`, args?.where);
        return mockUser;
      },
      findMany: async () => {
        console.log(`[MockClient] user.findMany called`);
        return [mockUser];
      },
      create: async (args: any) => {
        console.log(`[MockClient] user.create called`);
        return { ...mockUser, ...args?.data };
      },
      update: async (args: any) => {
        console.log(`[MockClient] user.update called`);
        return { ...mockUser, ...args?.data };
      },
      upsert: async (args: any) => {
        console.log(`[MockClient] user.upsert called`);
        return { ...mockUser, ...args?.create, ...args?.update };
      },
    },

    // Mock tenant model
    tenant: {
      findFirst: async () => {
        console.log(`[MockClient] tenant.findFirst called`);
        return { slug: tenantSlug, name: 'Mock Tenant', email: mockUser.email, isActive: true };
      },
      findUnique: async () => {
        console.log(`[MockClient] tenant.findUnique called`);
        return { slug: tenantSlug, name: 'Mock Tenant', email: mockUser.email, isActive: true };
      },
      upsert: async (args: any) => {
        console.log(`[MockClient] tenant.upsert called`);
        return { slug: tenantSlug, name: 'Mock Tenant', ...args?.create, ...args?.update };
      },
    },

    // Mock dataroom model
    dataroom: {
      findFirst: async () => {
        console.log(`[MockClient] dataroom.findFirst called`);
        return mockDataroom;
      },
      findUnique: async () => {
        console.log(`[MockClient] dataroom.findUnique called`);
        return mockDataroom;
      },
      findMany: async () => {
        console.log(`[MockClient] dataroom.findMany called`);
        return [mockDataroom];
      },
      create: async (args: any) => {
        console.log(`[MockClient] dataroom.create called`);
        return { ...mockDataroom, ...args?.data };
      },
    },

    // Mock dataroomMember model
    dataroomMember: {
      findFirst: async () => {
        console.log(`[MockClient] dataroomMember.findFirst called`);
        return { dataroomId: mockDataroomId, userId: mockUserId, role: 'owner', status: 'active' };
      },
      findMany: async () => {
        console.log(`[MockClient] dataroomMember.findMany called`);
        return [{ dataroomId: mockDataroomId, userId: mockUserId, role: 'owner', status: 'active' }];
      },
      create: async (args: any) => {
        console.log(`[MockClient] dataroomMember.create called`);
        return { dataroomId: mockDataroomId, userId: mockUserId, role: 'owner', status: 'active', ...args?.data };
      },
    },

    // Mock document model
    document: {
      findMany: async () => {
        console.log(`[MockClient] document.findMany called`);
        return [];
      },
      findFirst: async () => {
        console.log(`[MockClient] document.findFirst called`);
        return null;
      },
      create: async (args: any) => {
        console.log(`[MockClient] document.create called`);
        return { id: `mock-doc-${Date.now()}`, ...args?.data };
      },
    },

    // Mock folder model
    folder: {
      findMany: async () => {
        console.log(`[MockClient] folder.findMany called`);
        return [];
      },
      findFirst: async () => {
        console.log(`[MockClient] folder.findFirst called`);
        return null;
      },
    },

    // Mock chatSession model
    chatSession: {
      findMany: async () => {
        console.log(`[MockClient] chatSession.findMany called`);
        return [];
      },
      findFirst: async () => {
        console.log(`[MockClient] chatSession.findFirst called`);
        return null;
      },
      findUnique: async () => {
        console.log(`[MockClient] chatSession.findUnique called`);
        return null;
      },
      create: async (args: any) => {
        console.log(`[MockClient] chatSession.create called`);
        return { id: `mock-session-${Date.now()}`, ...args?.data };
      },
      update: async (args: any) => {
        console.log(`[MockClient] chatSession.update called`);
        return { id: `mock-session-${Date.now()}`, ...args?.data };
      },
    },

    // Mock chatMessage model
    chatMessage: {
      findMany: async () => {
        console.log(`[MockClient] chatMessage.findMany called`);
        return [];
      },
      create: async (args: any) => {
        console.log(`[MockClient] chatMessage.create called`);
        return { id: `mock-message-${Date.now()}`, ...args?.data };
      },
    },

    // Prisma client methods
    $connect: async () => {
      console.log(`[MockClient] $connect called (no-op in mock mode)`);
    },
    $disconnect: async () => {
      console.log(`[MockClient] $disconnect called (no-op in mock mode)`);
    },
    $executeRawUnsafe: async (query: string) => {
      console.log(`[MockClient] $executeRawUnsafe called:`, query.substring(0, 50) + '...');
      return 0;
    },
    $queryRawUnsafe: async () => {
      console.log(`[MockClient] $queryRawUnsafe called`);
      return [];
    },
  };

  return mockClient;
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
    console.log(`[TenantDB] ========================================`);
    console.log(`[TenantDB] MOCK MODE DETECTED for ${tenantSlug}`);
    console.log(`[TenantDB] Using tenant client: ${usingTenantClient}`);
    console.log(`[TenantDB] DATABASE_URL available: ${!!process.env.DATABASE_URL}`);

    // In mock mode, we create a mock client that returns fake data
    // This allows development/testing without a real tenant database
    console.log(`[TenantDB] Creating mock tenant client with fake data support`);

    // Create a mock client that mimics PrismaClient for basic operations
    const mockTenantClient = createMockTenantClient(tenantSlug);

    console.log(`[TenantDB] ✓ Mock tenant client created`);
    console.log(`[TenantDB] ========================================`);
    return mockTenantClient;
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
