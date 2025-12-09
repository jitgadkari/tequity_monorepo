-- Update tenant database URL to use connection pooler
-- Using ap-southeast-1 region (most common for India/Asia)
UPDATE tenants 
SET "databaseUrlEncrypted" = '10832afbac4d61f23d73d6c176d315b297b370c06a7cdbe16a5d663d8fa12db4:c802668cae437e56e0e2b81fa3e341e0:4dfba6687647c9d462ad0abd6f4aacba:851b92ad13417b44c6f8262cb9ee7f6a82968a7c59b3a01aa38c61851ba9a9108c294c8e9b9b16565688de81895f0323d14a53f1efcfe971ed404228c89a1ad6391479f7023561a25c730059a2a2e203883702b6afe9c01b278fad11136b3f9cf45f61719ec1f7bce74aa7b8c8f38c5166c4b7731705d72dacb6'
WHERE slug = 'testdataroom-f79dzl';

-- Verify the update
SELECT 
  slug,
  "supabaseProjectId",
  LENGTH("databaseUrlEncrypted") as new_url_length
FROM tenants 
WHERE slug = 'testdataroom-f79dzl';
