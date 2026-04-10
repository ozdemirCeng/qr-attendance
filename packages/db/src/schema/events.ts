import { sql } from "drizzle-orm";
import { check, index } from "drizzle-orm/pg-core";
import {
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "active",
  "completed",
  "archived",
]);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    locationName: varchar("location_name", { length: 160 }).notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    radiusMeters: integer("radius_meters").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    status: eventStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    createdByIdx: index("events_created_by_idx").on(table.createdBy),
    startsAtIdx: index("events_starts_at_idx").on(table.startsAt),
    statusIdx: index("events_status_idx").on(table.status),
    deletedAtIdx: index("events_deleted_at_idx").on(table.deletedAt),
    rangeCheck: check(
      "events_valid_range_check",
      sql`${table.endsAt} > ${table.startsAt}`,
    ),
  }),
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
