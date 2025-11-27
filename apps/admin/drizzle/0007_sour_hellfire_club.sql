CREATE TYPE "public"."prompt_type" AS ENUM('query_generation', 'fabric_extraction', 'custom');--> statement-breakpoint
CREATE TABLE "customer_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_slug" varchar(255) NOT NULL,
	"prompt_name" varchar(255) NOT NULL,
	"prompt_type" "prompt_type" NOT NULL,
	"prompt_text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar(255),
	"updated_by" varchar(255),
	CONSTRAINT "unique_customer_prompt_type" UNIQUE("customer_slug","prompt_type")
);
