ALTER TABLE "customer_prompts" ALTER COLUMN "prompt_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."prompt_type";--> statement-breakpoint
CREATE TYPE "public"."prompt_type" AS ENUM('decoding', 'validating', 'extracting', 'generating', 'bifurcation', 'custom');--> statement-breakpoint
ALTER TABLE "customer_prompts" ALTER COLUMN "prompt_type" SET DATA TYPE "public"."prompt_type" USING "prompt_type"::"public"."prompt_type";