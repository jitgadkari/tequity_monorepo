CREATE TYPE "public"."customer_status" AS ENUM('active', 'inactive', 'pending');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"plan" varchar(100) NOT NULL,
	"status" "customer_status" DEFAULT 'pending' NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"logo" varchar(1) NOT NULL,
	"logo_color" varchar(7) NOT NULL,
	"owner_email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
