import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@tequity/database';

// Shared database connection with main app
const connectionString = process.env.DATABASE_URL!;

// Create postgres client
const client = postgres(connectionString, { prepare: false });

// Create drizzle instance with shared schema
export const db = drizzle(client, { schema });

// Re-export schema for use in queries
export { schema };
