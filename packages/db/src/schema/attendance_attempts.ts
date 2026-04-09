import { index } from 'drizzle-orm/pg-core';
import {
  doublePrecision,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { sessions } from './sessions';

export const attendanceAttemptResultEnum = pgEnum('attendance_attempt_result', [
  'success',
  'failed',
]);

export const attendanceAttempts = pgTable(
  'attendance_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' })
      .notNull(),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 512 }),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    scannedAt: timestamp('scanned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    result: attendanceAttemptResultEnum('result').notNull(),
    reason: varchar('reason', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('attendance_attempts_session_id_idx').on(table.sessionId),
    scannedAtIdx: index('attendance_attempts_scanned_at_idx').on(table.scannedAt),
    resultIdx: index('attendance_attempts_result_idx').on(table.result),
  }),
);

export type AttendanceAttempt = typeof attendanceAttempts.$inferSelect;
export type NewAttendanceAttempt = typeof attendanceAttempts.$inferInsert;
