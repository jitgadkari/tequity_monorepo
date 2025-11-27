import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { customers } from './schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verify() {
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log('🔍 Verifying database contents...\n');

  const allCustomers = await db.select().from(customers);

  console.log(`📊 Total customers: ${allCustomers.length}\n`);

  allCustomers.forEach((customer, index) => {
    console.log(`${index + 1}. ${customer.name} (${customer.email})`);
    console.log(`   Plan: ${customer.plan} | Status: ${customer.status} | Logo: ${customer.logo}`);
  });

  await client.end();
  process.exit(0);
}

verify();
