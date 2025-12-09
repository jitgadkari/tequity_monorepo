import { getMasterDb } from '../lib/master-db';
import { encrypt } from '@tequity/utils';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function updateTenantDbUrl() {
  const tenantSlug = 'testdataroom-f79dzl';
  
  console.log('='.repeat(60));
  console.log('Update Tenant Database Connection String');
  console.log('='.repeat(60));
  console.log();
  console.log('Tenant:', tenantSlug);
  console.log();
  console.log('IMPORTANT: Get the connection string from Supabase:');
  console.log('1. Go to: https://supabase.com/dashboard/project/dohmbmwteexexuxsemee');
  console.log('2. Settings → Database → Connection string');
  console.log('3. Select "Connection pooling" (Transaction mode)');
  console.log('4. Copy the URI format');
  console.log();
  console.log('Expected format:');
  console.log('postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
  console.log();
  console.log('-'.repeat(60));
  
  const newDbUrl = await question('Paste the new database URL: ');
  
  if (!newDbUrl || !newDbUrl.startsWith('postgresql://')) {
    console.error('Invalid database URL format');
    rl.close();
    return;
  }
  
  // Validate it's using pooler
  if (!newDbUrl.includes('pooler.supabase.com')) {
    console.warn('⚠️  WARNING: This doesn\'t look like a pooler URL!');
    console.warn('   Make sure you selected "Connection pooling" in Supabase');
    const confirm = await question('Continue anyway? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Cancelled');
      rl.close();
      return;
    }
  }
  
  console.log();
  console.log('Encrypting and updating database...');
  
  const db = getMasterDb();
  
  try {
    const encrypted = encrypt(newDbUrl);
    
    await db.tenant.update({
      where: { slug: tenantSlug },
      data: {
        databaseUrlEncrypted: encrypted,
      }
    });
    
    console.log('✅ Database URL updated successfully!');
    console.log();
    console.log('Next steps:');
    console.log('1. Restart your dev server (Ctrl+C and run `pnpm dev`)');
    console.log('2. The connection cache will be cleared');
    console.log('3. Try accessing the application again');
    
  } catch (error) {
    console.error('❌ Error updating database:', error);
  } finally {
    await db.$disconnect();
    rl.close();
  }
}

updateTenantDbUrl().catch(console.error);
