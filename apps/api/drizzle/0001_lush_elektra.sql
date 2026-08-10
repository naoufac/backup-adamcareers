ALTER TABLE "master_profiles" ADD COLUMN "free_exports_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "master_profiles" ADD COLUMN "paid" boolean DEFAULT false NOT NULL;