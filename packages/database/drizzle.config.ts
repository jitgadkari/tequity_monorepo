import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env.local first, then .env from repo root
config({ path: '../../.env.local' });
config({ path: '../../.env' });

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
