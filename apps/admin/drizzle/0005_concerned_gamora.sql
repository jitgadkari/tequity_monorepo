-- Add setup_token column (nullable first)
ALTER TABLE "customers" ADD COLUMN "setup_token" varchar(64);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "setup_completed" timestamp;--> statement-breakpoint

-- Generate unique tokens for existing customers
UPDATE "customers" SET "setup_token" = md5(random()::text || clock_timestamp()::text) WHERE "setup_token" IS NULL;--> statement-breakpoint

-- Make setup_token NOT NULL and add unique constraint
ALTER TABLE "customers" ALTER COLUMN "setup_token" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_setup_token_unique" UNIQUE("setup_token");