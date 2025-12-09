import { PrismaClient } from '@prisma/master-client';

// Singleton pattern for Prisma client
// Prevents multiple instances during development hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Log master DB initialization
if (!globalForPrisma.prisma) {
  console.log('[MasterDB] Initializing master database connection');
  const masterDbUrl = process.env.DATABASE_URL || '';
  
  // Log redacted connection info for debugging
  if (masterDbUrl) {
    const urlParts = masterDbUrl.split('@');
    const hostPart = urlParts[1]?.split('/')[0] || 'unknown';
    const dbPart = urlParts[1]?.split('/')[1]?.split('?')[0] || 'unknown';
    console.log(`[MasterDB] Connection URL - host: ${hostPart}, database: ${dbPart}`);
  } else {
    console.warn('[MasterDB] No DATABASE_URL environment variable found');
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export for convenience
export { PrismaClient };
export type { Prisma } from '@prisma/master-client';

// Helper function to get the database client
export function getDb() {
  console.log('[MasterDB] getDb() called - returning master database client');
  return prisma;
}

// Helper function to disconnect (useful for tests/scripts)
export async function disconnectDb() {
  await prisma.$disconnect();
}
