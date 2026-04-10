import { sql } from "drizzle-orm";
import { check, index } from "drizzle-orm/pg-core";
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { events } from "./events";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    eventIdIdx: index("sessions_event_id_idx").on(table.eventId),
    startsAtIdx: index("sessions_starts_at_idx").on(table.startsAt),
    eventStartsAtIdx: index("sessions_event_id_starts_at_idx").on(
      table.eventId,
      table.startsAt,
    ),
    deletedAtIdx: index("sessions_deleted_at_idx").on(table.deletedAt),
    rangeCheck: check(
      "sessions_valid_range_check",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
  }),
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
