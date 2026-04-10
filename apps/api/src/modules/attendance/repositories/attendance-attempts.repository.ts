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
  async create(
    input: CreateAttendanceAttemptInput,
  ): Promise<AttendanceAttemptEntity> {
    const sql = getSql();
    const rows = (await sql.query(
      `
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
      `,
      [
        input.sessionId,
        input.rawSessionRef,
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
    const sql = getSql();
    const rows = (await sql.query(
      `
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
      `,
      [sessionId],
    )) as AttendanceAttemptRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: AttendanceAttemptRow): AttendanceAttemptEntity {
    return {
      ...row,
      scannedAt: toIsoString(row.scannedAt),
      createdAt: toIsoString(row.createdAt),
    };
  }
}
