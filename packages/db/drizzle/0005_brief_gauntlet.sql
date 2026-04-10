ALTER TABLE "attendance_records"
ADD COLUMN "verification_photo_data_url" text;
--> statement-breakpoint
ALTER TABLE "attendance_records"
ADD COLUMN "verification_photo_captured_at" timestamp with time zone;
