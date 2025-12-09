import { getMasterDb } from '../lib/master-db';
import { decrypt } from '@tequity/utils';

async function decryptDbUrl() {
  const db = getMasterDb();
  
  const tenant = await db.tenant.findUnique({
    where: { slug: 'testdataroom-f79dzl' },
    select: {
      slug: true,
      supabaseProjectId: true,
      supabaseProjectRef: true,
      databaseUrlEncrypted: true,
    }
  });
  
  if (!tenant) {
    console.log('Tenant not found');
    return;
  }
  
  console.log('Tenant:', tenant.slug);
  console.log('Supabase Project ID:', tenant.supabaseProjectId);
  console.log('Supabase Project Ref:', tenant.supabaseProjectRef);
  
  if (tenant.databaseUrlEncrypted) {
    const decrypted = decrypt(tenant.databaseUrlEncrypted);
    console.log('\nDecrypted Database URL:');
    console.log(decrypted);
    
    // Parse and show components
    const url = new URL(decrypted);
    console.log('\nURL Components:');
    console.log('Protocol:', url.protocol);
    console.log('Host:', url.hostname);
    console.log('Port:', url.port);
    console.log('Database:', url.pathname.substring(1));
    console.log('Search params:', url.search);
  }
  
  await db.$disconnect();
}

decryptDbUrl().catch(console.error);
