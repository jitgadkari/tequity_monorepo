-- Drop old unique constraint
ALTER TABLE "customer_prompts" DROP CONSTRAINT "unique_customer_prompt_type";--> statement-breakpoint

-- Add prompt_identifier column (nullable first)
ALTER TABLE "customer_prompts" ADD COLUMN "prompt_identifier" varchar(255);--> statement-breakpoint

-- Populate prompt_identifier from existing data (format: "type:slugified-name")
UPDATE "customer_prompts"
SET "prompt_identifier" = "prompt_type" || ':' || lower(
  regexp_replace(
    regexp_replace(trim("prompt_name"), '[^a-zA-Z0-9\s-]', '', 'g'),
    '[\s_]+',
    '-',
    'g'
  )
)
WHERE "prompt_identifier" IS NULL;--> statement-breakpoint

-- Make prompt_identifier NOT NULL
ALTER TABLE "customer_prompts" ALTER COLUMN "prompt_identifier" SET NOT NULL;--> statement-breakpoint

-- Add new unique constraint
ALTER TABLE "customer_prompts" ADD CONSTRAINT "unique_customer_prompt_identifier" UNIQUE("customer_slug","prompt_identifier");