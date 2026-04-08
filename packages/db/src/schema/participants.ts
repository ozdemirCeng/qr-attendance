import { index } from "drizzle-orm/pg-core";
import {
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { events } from "./events";

export const participantSourceEnum = pgEnum("participant_source", [
  "csv",
  "manual",
  "self_registered",
]);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    source: participantSourceEnum("source").notNull().default("manual"),
    externalId: varchar("external_id", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventIdIdx: index("participants_event_id_idx").on(table.eventId),
    sourceIdx: index("participants_source_idx").on(table.source),
    createdAtIdx: index("participants_created_at_idx").on(table.createdAt),
    emailEventIdUniqueIdx: uniqueIndex("participants_email_event_id_unique").on(
      table.email,
      table.eventId,
    ),
  }),
);

export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
