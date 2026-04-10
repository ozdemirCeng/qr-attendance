import {
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { events } from "./events";

export const exportJobStatusEnum = pgEnum("export_job_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    status: exportJobStatusEnum("status").notNull().default("pending"),
    progress: integer("progress").notNull().default(0),
    filePath: varchar("file_path", { length: 1024 }),
    downloadUrl: varchar("download_url", { length: 1024 }),
    errorMessage: varchar("error_message", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    eventIdIdx: index("export_jobs_event_id_idx").on(table.eventId),
    statusIdx: index("export_jobs_status_idx").on(table.status),
    createdAtIdx: index("export_jobs_created_at_idx").on(table.createdAt),
  }),
);

export type ExportJob = typeof exportJobs.$inferSelect;
export type NewExportJob = typeof exportJobs.$inferInsert;
