import { getMasterDb } from '../lib/master-db';

async function checkTenant() {
  const db = getMasterDb();
  
  const tenant = await db.tenant.findUnique({
    where: { slug: 'testdataroom-f79dzl' },
    select: {
      slug: true,
      supabaseProjectId: true,
      supabaseProjectRef: true,
      status: true,
      databaseUrlEncrypted: true,
    }
  });
  
  console.log('Current tenant data:');
  console.log('Slug:', tenant?.slug);
  console.log('Supabase Project ID:', tenant?.supabaseProjectId);
  console.log('Supabase Project Ref:', tenant?.supabaseProjectRef);
  console.log('Status:', tenant?.status);
  console.log('Has encrypted DB URL:', !!tenant?.databaseUrlEncrypted);
  console.log('DB URL length:', tenant?.databaseUrlEncrypted?.length);
  
  await db.$disconnect();
}

checkTenant().catch(console.error);
