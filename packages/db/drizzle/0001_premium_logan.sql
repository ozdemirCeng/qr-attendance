CREATE TYPE "public"."participant_source" AS ENUM('csv', 'manual', 'self_registered');--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"source" "participant_source" DEFAULT 'manual' NOT NULL,
	"external_id" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "participants_event_id_idx" ON "participants" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "participants_source_idx" ON "participants" USING btree ("source");--> statement-breakpoint
CREATE INDEX "participants_created_at_idx" ON "participants" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_email_event_id_unique" ON "participants" USING btree ("email","event_id");