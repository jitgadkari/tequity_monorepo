-- Add db_url column with default value for existing rows
ALTER TABLE "customers" ADD COLUMN "db_url" text;
UPDATE "customers" SET "db_url" = 'pending-setup' WHERE "db_url" IS NULL;
ALTER TABLE "customers" ALTER COLUMN "db_url" SET NOT NULL;