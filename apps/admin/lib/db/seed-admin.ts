import { prisma } from '@tequity/database';
import * as dotenv from 'dotenv';
import * as path from 'path';
import bcrypt from 'bcryptjs';

// Hash password function (copied from auth to avoid next/headers import)
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Load environment variables from root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function seedAdmin() {
  console.log('🔐 Seeding platform admin...');

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.platformAdmin.findFirst();

    if (existingAdmin) {
      console.log('ℹ️  Admin already exists, skipping seed');
      await prisma.$disconnect();
      return;
    }

    // Create default admin
    const defaultPassword = 'admin123'; // Change this in production!
    const hashedPassword = await hashPassword(defaultPassword);

    await prisma.platformAdmin.create({
      data: {
        email: 'admin@platform.com',
        password: hashedPassword,
        name: 'Platform Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Successfully created admin user!');
    console.log('📧 Email: admin@platform.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
  } catch (error) {
    console.error('❌ Admin seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.$disconnect();
}

seedAdmin();
