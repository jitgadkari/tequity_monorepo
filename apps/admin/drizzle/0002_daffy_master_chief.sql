CREATE TYPE "public"."platform_admin_role" AS ENUM('super_admin', 'admin');--> statement-breakpoint
CREATE TYPE "public"."platform_admin_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "platform_admin_role" DEFAULT 'admin' NOT NULL,
	"status" "platform_admin_status" DEFAULT 'active' NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_email_unique" UNIQUE("email")
);
