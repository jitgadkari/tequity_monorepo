import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Disable prefetch for Neon serverless driver
const connectionString = process.env.DATABASE_URL!;

// Create postgres client
const client = postgres(connectionString, { prepare: false });

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export schema for use in queries
export { schema };
