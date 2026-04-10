CREATE TYPE "public"."export_job_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar(255),
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(120) NOT NULL,
	"entity_id" varchar(255),
	"metadata_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "export_job_status" DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"file_path" varchar(1024),
	"download_url" varchar(1024),
	"error_message" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attendance_attempts" DROP CONSTRAINT "attendance_attempts_session_id_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_created_by_admins_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance_attempts" ALTER COLUMN "session_id" SET DATA TYPE varchar(120);--> statement-breakpoint
ALTER TABLE "attendance_attempts" ALTER COLUMN "session_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_by" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD COLUMN "raw_session_ref" varchar(120);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "phone_normalized" varchar(32);--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "participants"
SET "phone_normalized" = CASE
	WHEN "phone" IS NULL THEN NULL
	WHEN right(regexp_replace("phone", '\D', '', 'g'), 10) = '' THEN NULL
	ELSE right(regexp_replace("phone", '\D', '', 'g'), 10)
END;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "export_jobs_event_id_idx" ON "export_jobs" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "export_jobs_status_idx" ON "export_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "export_jobs_created_at_idx" ON "export_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "attendance_records_event_id_scanned_at_idx" ON "attendance_records" USING btree ("event_id","scanned_at");--> statement-breakpoint
CREATE INDEX "events_deleted_at_idx" ON "events" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "participants_event_id_created_at_idx" ON "participants" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_phone_event_id_unique" ON "participants" USING btree ("phone_normalized","event_id");--> statement-breakpoint
CREATE INDEX "sessions_event_id_starts_at_idx" ON "sessions" USING btree ("event_id","starts_at");--> statement-breakpoint
CREATE INDEX "sessions_deleted_at_idx" ON "sessions" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_valid_range_check" CHECK ("events"."ends_at" > "events"."starts_at");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_valid_range_check" CHECK ("sessions"."ends_at" > "sessions"."starts_at");
