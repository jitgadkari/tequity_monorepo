/**
 * Script to verify database records after testing
 * Run with: npx tsx scripts/verify-db.ts
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../packages/database/src/schema';

// Load environment variables
config({ path: 'apps/main/.env.local' });
config({ path: 'apps/main/.env' });

async function verifyDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  console.log('🔍 Connecting to database...\n');

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    // Check users
    const users = await db.query.users.findMany();
    console.log('👤 Users:', users.length);
    users.forEach(u => {
      console.log(`   - ${u.email} (verified: ${u.emailVerified}, onboarding: ${u.onboardingCompleted})`);
    });

    // Check tenants
    const tenants = await db.query.tenants.findMany();
    console.log('\n🏢 Tenants:', tenants.length);
    tenants.forEach(t => {
      console.log(`   - ${t.name} (/${t.slug}) - Status: ${t.status}`);
    });

    // Check memberships
    const memberships = await db.query.tenantMemberships.findMany();
    console.log('\n👥 Memberships:', memberships.length);
    memberships.forEach(m => {
      console.log(`   - User ${m.userId} -> Tenant ${m.tenantId} (${m.role})`);
    });

    // Check subscriptions
    const subscriptions = await db.query.subscriptions.findMany();
    console.log('\n💳 Subscriptions:', subscriptions.length);
    subscriptions.forEach(s => {
      console.log(`   - Tenant ${s.tenantId}: ${s.planId} (${s.status})`);
    });

    // Check onboarding
    const onboarding = await db.query.tenantOnboarding.findMany();
    console.log('\n📋 Onboarding Records:', onboarding.length);
    onboarding.forEach(o => {
      console.log(`   - User ${o.userId}: Company=${o.companyInfoCompleted}, UseCase=${o.useCaseCompleted}, Payment=${o.paymentCompleted}`);
    });

    console.log('\n✅ Database verification complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

verifyDatabase();
