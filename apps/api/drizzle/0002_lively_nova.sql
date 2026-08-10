ALTER TABLE "master_profiles" ADD COLUMN "cv_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "master_profiles" ADD COLUMN "analytics_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "master_profiles" ADD COLUMN "cv_views" integer DEFAULT 0 NOT NULL;