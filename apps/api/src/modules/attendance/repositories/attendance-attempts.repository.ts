import { Injectable } from '@nestjs/common';

import { getSql, toIsoString } from '../../../common/database/neon';
import {
  AttendanceAttemptEntity,
  AttendanceAttemptResult,
} from '../attendance.types';

type CreateAttendanceAttemptInput = {
  sessionId: string | null;
  rawSessionRef: string | null;
  ip: string | null;
  userAgent: string | null;
  latitude: number | null;
  longitude: number | null;
  scannedAt: string;
  result: AttendanceAttemptResult;
  reason: string | null;
};

type AttendanceAttemptRow = AttendanceAttemptEntity;

@Injectable()
export class AttendanceAttemptsRepository {
  private columnSupport: Promise<{
    rawSessionRef: boolean;
    nullableSessionId: boolean;
  }> | null = null;

  async create(
    input: CreateAttendanceAttemptInput,
  ): Promise<AttendanceAttemptEntity> {
    const support = await this.getColumnSupport();
    const sql = getSql();

    if (!support.rawSessionRef && !input.sessionId) {
      return this.createUnpersistedAttempt(input);
    }

    const rows = (await sql.query(
      support.rawSessionRef
        ? `
            insert into attendance_attempts (
              session_id,
              raw_session_ref,
              ip,
              user_agent,
              latitude,
              longitude,
              scanned_at,
              result,
              reason
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            returning
              id,
              session_id as "sessionId",
              raw_session_ref as "rawSessionRef",
              ip,
              user_agent as "userAgent",
              latitude,
              longitude,
              scanned_at as "scannedAt",
              result,
              reason,
              created_at as "createdAt"
          `
        : `
            insert into attendance_attempts (
              session_id,
              ip,
              user_agent,
              latitude,
              longitude,
              scanned_at,
              result,
              reason
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8)
            returning
              id,
              session_id as "sessionId",
              null::text as "rawSessionRef",
              ip,
              user_agent as "userAgent",
              latitude,
              longitude,
              scanned_at as "scannedAt",
              result,
              reason,
              created_at as "createdAt"
          `,
      support.rawSessionRef
        ? [
            input.sessionId,
            input.rawSessionRef,
            input.ip,
            input.userAgent,
            input.latitude,
            input.longitude,
            input.scannedAt,
            input.result,
            input.reason,
          ]
        : [
            input.sessionId,
            input.ip,
            input.userAgent,
            input.latitude,
            input.longitude,
            input.scannedAt,
            input.result,
            input.reason,
          ],
    )) as AttendanceAttemptRow[];

    return this.mapRow(rows[0]);
  }

  async findBySessionId(sessionId: string) {
    const support = await this.getColumnSupport();
    const sql = getSql();
    const rows = (await sql.query(
      support.rawSessionRef
        ? `
            select
              id,
              session_id as "sessionId",
              raw_session_ref as "rawSessionRef",
              ip,
              user_agent as "userAgent",
              latitude,
              longitude,
              scanned_at as "scannedAt",
              result,
              reason,
              created_at as "createdAt"
            from attendance_attempts
            where coalesce(session_id, raw_session_ref) = $1
            order by scanned_at desc
          `
        : `
            select
              id,
              session_id as "sessionId",
              null::text as "rawSessionRef",
              ip,
              user_agent as "userAgent",
              latitude,
              longitude,
              scanned_at as "scannedAt",
              result,
              reason,
              created_at as "createdAt"
            from attendance_attempts
            where session_id = $1
            order by scanned_at desc
          `,
      [sessionId],
    )) as AttendanceAttemptRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private async getColumnSupport() {
    if (!this.columnSupport) {
      this.columnSupport = this.detectColumnSupport();
    }

    return this.columnSupport;
  }

  private async detectColumnSupport() {
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          exists (
            select 1
            from information_schema.columns
            where table_name = 'attendance_attempts'
              and column_name = 'raw_session_ref'
          ) as "rawSessionRef",
          coalesce((
            select is_nullable = 'YES'
            from information_schema.columns
            where table_name = 'attendance_attempts'
              and column_name = 'session_id'
          ), true) as "nullableSessionId"
      `,
    )) as Array<{ rawSessionRef: boolean; nullableSessionId: boolean }>;

    return {
      rawSessionRef: rows[0]?.rawSessionRef ?? false,
      nullableSessionId: rows[0]?.nullableSessionId ?? true,
    };
  }

  private createUnpersistedAttempt(
    input: CreateAttendanceAttemptInput,
  ): AttendanceAttemptEntity {
    return {
      id: 'unpersisted',
      sessionId: input.sessionId,
      rawSessionRef: input.rawSessionRef,
      ip: input.ip,
      userAgent: input.userAgent,
      latitude: input.latitude,
      longitude: input.longitude,
      scannedAt: toIsoString(input.scannedAt),
      result: input.result,
      reason: input.reason,
      createdAt: new Date().toISOString(),
    };
  }

  private mapRow(row: AttendanceAttemptRow): AttendanceAttemptEntity {
    return {
      ...row,
      scannedAt: toIsoString(row.scannedAt),
      createdAt: toIsoString(row.createdAt),
    };
  }
}
