import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { customers } from './schema';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create dedicated connection for seeding
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

const mockCustomers = [
  {
    name: "Acme Inc.",
    email: "john.doe@acme.com",
    plan: "Basic Plan",
    status: "active" as const,
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    logo: "A",
    logoColor: "#FF5722",
    ownerEmail: "john.doe@acme.com",
    dbUrl: "postgresql://acme_user:acme_pass@localhost:5432/acme_db",
    slug: "acme-inc",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
  {
    name: "Beta Corp.",
    email: "jane.smith@beta.com",
    plan: "Standard Plan",
    status: "active" as const,
    lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    logo: "B",
    logoColor: "#2196F3",
    ownerEmail: "jane.smith@beta.com",
    dbUrl: "postgresql://beta_user:beta_pass@localhost:5432/beta_db",
    slug: "beta-corp",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
  {
    name: "Gamma Ltd.",
    email: "dan.brown@gamma.com",
    plan: "Premium Plan",
    status: "inactive" as const,
    lastActive: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    logo: "G",
    logoColor: "#9C27B0",
    ownerEmail: "dan.brown@gamma.com",
    dbUrl: "postgresql://gamma_user:gamma_pass@localhost:5432/gamma_db",
    slug: "gamma-ltd",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
  {
    name: "Delta Solutions",
    email: "emily.jones@delta.com",
    plan: "Basic Plan",
    status: "pending" as const,
    lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    logo: "D",
    logoColor: "#9C27B0",
    ownerEmail: "emily.jones@delta.com",
    dbUrl: "postgresql://delta_user:delta_pass@localhost:5432/delta_db",
    slug: "delta-solutions",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
  {
    name: "Epsilon Tech",
    email: "chris.williams@epsilon.com",
    plan: "Pro Plan",
    status: "active" as const,
    lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    logo: "E",
    logoColor: "#795548",
    ownerEmail: "chris.williams@epsilon.com",
    dbUrl: "postgresql://epsilon_user:epsilon_pass@localhost:5432/epsilon_db",
    slug: "epsilon-tech",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
  {
    name: "Zeta Enterprises",
    email: "pat.taylor@zeta.com",
    plan: "Basic Plan",
    status: "active" as const,
    lastActive: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    logo: "Z",
    logoColor: "#607D8B",
    ownerEmail: "pat.taylor@zeta.com",
    dbUrl: "postgresql://zeta_user:zeta_pass@localhost:5432/zeta_db",
    slug: "zeta-enterprises",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
  {
    name: "Theta Innovations",
    email: "alex.miller@theta.com",
    plan: "Enterprise Plan",
    status: "inactive" as const,
    lastActive: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    logo: "T",
    logoColor: "#607D8B",
    ownerEmail: "alex.miller@theta.com",
    dbUrl: "postgresql://theta_user:theta_pass@localhost:5432/theta_db",
    slug: "theta-innovations",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
  {
    name: "Iota Holdings",
    email: "nina.kim@iota.com",
    plan: "Standard Plan",
    status: "active" as const,
    lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    logo: "I",
    logoColor: "#424242",
    ownerEmail: "nina.kim@iota.com",
    dbUrl: "postgresql://iota_user:iota_pass@localhost:5432/iota_db",
    slug: "iota-holdings",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
  {
    name: "Kappa Group",
    email: "leo.chen@kappa.com",
    plan: "Basic Plan",
    status: "active" as const,
    lastActive: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    logo: "K",
    logoColor: "#607D8B",
    ownerEmail: "leo.chen@kappa.com",
    dbUrl: "postgresql://kappa_user:kappa_pass@localhost:5432/kappa_db",
    slug: "kappa-group",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
  {
    name: "Lambda Labs",
    email: "sara.lee@lambda.com",
    plan: "Premium Plan",
    status: "inactive" as const,
    lastActive: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 2 months ago
    logo: "L",
    logoColor: "#FF9800",
    ownerEmail: "sara.lee@lambda.com",
    dbUrl: "postgresql://lambda_user:lambda_pass@localhost:5432/lambda_db",
    slug: "lambda-labs",
    setupToken: crypto.randomBytes(32).toString('hex'),
  },
];

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Clear existing data
    console.log('🗑️  Clearing existing customers...');
    await db.delete(customers);

    // Insert customers
    console.log('📦 Inserting customers...');
    await db.insert(customers).values(mockCustomers);

    console.log(`✅ Successfully seeded ${mockCustomers.length} customers!`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await client.end();
    process.exit(1);
  }

  await client.end();
  process.exit(0);
}

seed();
