import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { platformAdmins } from '@tequity/database';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Hash password function (copied from auth to avoid next/headers import)
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Create dedicated connection for seeding
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seedAdmin() {
  console.log('🔐 Seeding platform admin...');

  try {
    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(platformAdmins)
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('ℹ️  Admin already exists, skipping seed');
      await client.end();
      return;
    }

    // Create default admin
    const defaultPassword = 'admin123'; // Change this in production!
    const hashedPassword = await hashPassword(defaultPassword);

    await db.insert(platformAdmins).values({
      email: 'admin@platform.com',
      password: hashedPassword,
      name: 'Platform Admin',
      role: 'super_admin',
      status: 'active',
    });

    console.log('✅ Successfully created admin user!');
    console.log('📧 Email: admin@platform.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
  } catch (error) {
    console.error('❌ Admin seeding failed:', error);
    await client.end();
    process.exit(1);
  }

  await client.end();
}

seedAdmin();
