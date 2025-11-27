import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables from repo root
dotenv.config({ path: '../../.env.local' });
dotenv.config({ path: '../../.env' });

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
