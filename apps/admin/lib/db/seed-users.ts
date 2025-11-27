import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, customers } from './schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// Helper to generate initials from name
const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

// Helper to calculate time ago
const getTimeAgo = (hoursAgo: number): Date => {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
};

async function seedUsers() {
  console.log('🌱 Seeding users...');

  try {
    // Get first 3 customers
    const customerList = await db.select({ id: customers.id, name: customers.name }).from(customers).limit(3);

    if (customerList.length === 0) {
      console.log('⚠️  No customers found. Please seed customers first.');
      await client.end();
      process.exit(1);
    }

    console.log(`📦 Found ${customerList.length} customers`);

    // Clear existing users
    console.log('🗑️  Clearing existing users...');
    await db.delete(users);

    // Create users for each customer
    const mockUsers = [];

    // Users for first customer (3-4 users)
    if (customerList[0]) {
      mockUsers.push(
        {
          customerId: customerList[0].id,
          name: 'John Doe',
          email: 'john.doe@' + customerList[0].name.toLowerCase().replace(/\s+/g, '') + '.com',
          role: 'admin' as const,
          status: 'active' as const,
          avatar: getInitials('John Doe'),
          lastActive: getTimeAgo(2),
        },
        {
          customerId: customerList[0].id,
          name: 'Jane Smith',
          email: 'jane.smith@' + customerList[0].name.toLowerCase().replace(/\s+/g, '') + '.com',
          role: 'general' as const,
          status: 'active' as const,
          avatar: getInitials('Jane Smith'),
          lastActive: getTimeAgo(1),
        },
        {
          customerId: customerList[0].id,
          name: 'Alice Johnson',
          email: 'alice.johnson@' + customerList[0].name.toLowerCase().replace(/\s+/g, '') + '.com',
          role: 'general' as const,
          status: 'inactive' as const,
          avatar: getInitials('Alice Johnson'),
          lastActive: getTimeAgo(96), // 4 days
        }
      );
    }

    // Users for second customer (2-3 users)
    if (customerList[1]) {
      mockUsers.push(
        {
          customerId: customerList[1].id,
          name: 'Bob Brown',
          email: 'bob.brown@' + customerList[1].name.toLowerCase().replace(/\s+/g, '') + '.com',
          role: 'admin' as const,
          status: 'active' as const,
          avatar: getInitials('Bob Brown'),
          lastActive: getTimeAgo(5),
        },
        {
          customerId: customerList[1].id,
          name: 'Charlie Davis',
          email: 'charlie.davis@' + customerList[1].name.toLowerCase().replace(/\s+/g, '') + '.com',
          role: 'general' as const,
          status: 'pending' as const,
          avatar: getInitials('Charlie Davis'),
          lastActive: getTimeAgo(72), // 3 days
        }
      );
    }

    // Users for third customer (2 users)
    if (customerList[2]) {
      mockUsers.push(
        {
          customerId: customerList[2].id,
          name: 'Eve White',
          email: 'eve.white@' + customerList[2].name.toLowerCase().replace(/\s+/g, '') + '.com',
          role: 'admin' as const,
          status: 'active' as const,
          avatar: getInitials('Eve White'),
          lastActive: getTimeAgo(0.5), // 30 minutes
        },
        {
          customerId: customerList[2].id,
          name: 'Michael Green',
          email: 'michael.green@' + customerList[2].name.toLowerCase().replace(/\s+/g, '') + '.com',
          role: 'general' as const,
          status: 'active' as const,
          avatar: getInitials('Michael Green'),
          lastActive: getTimeAgo(12),
        }
      );
    }

    // Insert users
    console.log(`📦 Inserting ${mockUsers.length} users...`);
    await db.insert(users).values(mockUsers);

    console.log(`✅ Successfully seeded ${mockUsers.length} users!`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await client.end();
    process.exit(1);
  }

  await client.end();
  process.exit(0);
}

seedUsers();
