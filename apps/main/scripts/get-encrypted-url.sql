-- Get the encrypted database URL for analysis
-- You'll need to decrypt this manually using the ENCRYPTION_KEY
SELECT 
  slug,
  "supabaseProjectId",
  "supabaseProjectRef",
  "databaseUrlEncrypted",
  LENGTH("databaseUrlEncrypted") as encrypted_length
FROM tenants 
WHERE slug = 'testdataroom-f79dzl';
