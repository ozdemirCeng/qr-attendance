CREATE TYPE "public"."attendance_attempt_result" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TABLE "attendance_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"ip" varchar(64),
	"user_agent" varchar(512),
	"latitude" double precision,
	"longitude" double precision,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"result" "attendance_attempt_result" NOT NULL,
	"reason" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"participant_id" uuid,
	"full_name" varchar(160) NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"accuracy" double precision,
	"distance_from_venue" double precision,
	"is_valid" boolean DEFAULT true NOT NULL,
	"invalid_reason" text,
	"qr_nonce" varchar(120),
	"ip_address" varchar(64),
	"device_fingerprint" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_attempts" ADD CONSTRAINT "attendance_attempts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_attempts_session_id_idx" ON "attendance_attempts" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attendance_attempts_scanned_at_idx" ON "attendance_attempts" USING btree ("scanned_at");--> statement-breakpoint
CREATE INDEX "attendance_attempts_result_idx" ON "attendance_attempts" USING btree ("result");--> statement-breakpoint
CREATE INDEX "attendance_records_event_id_idx" ON "attendance_records" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "attendance_records_session_id_idx" ON "attendance_records" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attendance_records_scanned_at_idx" ON "attendance_records" USING btree ("scanned_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_records_participant_session_unique" ON "attendance_records" USING btree ("participant_id","session_id") WHERE "attendance_records"."participant_id" is not null;