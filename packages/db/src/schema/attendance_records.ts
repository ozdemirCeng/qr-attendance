import { index, uniqueIndex } from 'drizzle-orm/pg-core';
import {
  boolean,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql';

import { events } from './events';
import { participants } from './participants';
import { sessions } from './sessions';

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    eventId: uuid('event_id')
      .references(() => events.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' })
      .notNull(),
    participantId: uuid('participant_id').references(() => participants.id, {
      onDelete: 'set null',
    }),
    fullName: varchar('full_name', { length: 160 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
    scannedAt: timestamp('scanned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    accuracy: doublePrecision('accuracy'),
    distanceFromVenue: doublePrecision('distance_from_venue'),
    isValid: boolean('is_valid').notNull().default(true),
    invalidReason: text('invalid_reason'),
    qrNonce: varchar('qr_nonce', { length: 120 }),
    ipAddress: varchar('ip_address', { length: 64 }),
    deviceFingerprint: varchar('device_fingerprint', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    eventIdIdx: index('attendance_records_event_id_idx').on(table.eventId),
    sessionIdIdx: index('attendance_records_session_id_idx').on(table.sessionId),
    scannedAtIdx: index('attendance_records_scanned_at_idx').on(table.scannedAt),
    participantSessionUniqueIdx: uniqueIndex(
      'attendance_records_participant_session_unique',
    )
      .on(table.participantId, table.sessionId)
      .where(sql`${table.participantId} is not null`),
  }),
);

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecords.$inferInsert;
