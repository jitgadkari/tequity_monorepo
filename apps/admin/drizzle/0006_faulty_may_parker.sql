-- Add slug column (nullable first)
ALTER TABLE "customers" ADD COLUMN "slug" varchar(255);--> statement-breakpoint

-- Generate slugs for existing customers
UPDATE "customers"
SET "slug" = lower(
  regexp_replace(
    regexp_replace(trim("name"), '[^a-zA-Z0-9\s-]', '', 'g'),
    '[\s_]+',
    '-',
    'g'
  )
)
WHERE "slug" IS NULL;--> statement-breakpoint

-- Handle duplicates by appending row number
WITH numbered_customers AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY "created_at") as rn
  FROM "customers"
)
UPDATE "customers" c
SET "slug" = CASE
  WHEN nc.rn > 1 THEN c.slug || '-' || nc.rn
  ELSE c.slug
END
FROM numbered_customers nc
WHERE c.id = nc.id AND nc.rn > 1;--> statement-breakpoint

-- Make slug NOT NULL and add unique constraint
ALTER TABLE "customers" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_slug_unique" UNIQUE("slug");