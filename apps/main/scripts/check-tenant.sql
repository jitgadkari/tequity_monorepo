-- Check current tenant configuration
SELECT 
  slug,
  "supabaseProjectId",
  "supabaseProjectRef",
  status,
  LENGTH("databaseUrlEncrypted") as db_url_length
FROM tenants 
WHERE slug = 'testdataroom-f79dzl';
