import { PrismaClient } from '@prisma/master-client';

// Singleton pattern for Prisma client
// Prevents multiple instances during development hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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
  return prisma;
}

// Helper function to disconnect (useful for tests/scripts)
export async function disconnectDb() {
  await prisma.$disconnect();
}
