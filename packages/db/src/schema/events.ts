import { index } from "drizzle-orm/pg-core";
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

import { admins } from "./admins";

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
    createdBy: uuid("created_by")
      .references(() => admins.id, { onDelete: "restrict" })
      .notNull(),
    status: eventStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdByIdx: index("events_created_by_idx").on(table.createdBy),
    startsAtIdx: index("events_starts_at_idx").on(table.startsAt),
    statusIdx: index("events_status_idx").on(table.status),
  }),
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;