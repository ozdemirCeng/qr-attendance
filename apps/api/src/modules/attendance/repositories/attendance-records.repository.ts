import { Injectable } from '@nestjs/common';

import {
  escapeLikePattern,
  getSql,
  isUuidLike,
  toIsoString,
  toNullableIsoString,
} from '../../../common/database/neon';
import { AttendanceRecordEntity } from '../attendance.types';

type CreateAttendanceRecordInput = Omit<
  AttendanceRecordEntity,
  'id' | 'createdAt'
>;

type ListAttendanceRecordsInput = {
  eventId: string;
  sessionId?: string;
  search?: string;
  isValid?: boolean;
  page: number;
  limit: number;
};

type UpdateAttendanceRecordInput = Partial<
  Pick<AttendanceRecordEntity, 'isValid' | 'invalidReason'>
>;

type AttendanceRecordRow = AttendanceRecordEntity;

@Injectable()
export class AttendanceRecordsRepository {
  private verificationPhotoColumnSupport: Promise<boolean> | null = null;

  async create(
    input: CreateAttendanceRecordInput,
  ): Promise<AttendanceRecordEntity> {
    const supportsVerificationPhoto = await this.hasVerificationPhotoColumns();
    const sql = getSql();
    const rows = (await sql.query(
      supportsVerificationPhoto
        ? `
            insert into attendance_records (
              event_id,
              session_id,
              participant_id,
              full_name,
              email,
              phone,
              scanned_at,
              latitude,
              longitude,
              accuracy,
              distance_from_venue,
              is_valid,
              invalid_reason,
              qr_nonce,
              ip_address,
              device_fingerprint,
              verification_photo_data_url,
              verification_photo_captured_at
            )
            values (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13, $14, $15, $16, $17, $18
            )
            returning
              ${this.selectColumns(true)}
          `
        : `
            insert into attendance_records (
              event_id,
              session_id,
              participant_id,
              full_name,
              email,
              phone,
              scanned_at,
              latitude,
              longitude,
              accuracy,
              distance_from_venue,
              is_valid,
              invalid_reason,
              qr_nonce,
              ip_address,
              device_fingerprint
            )
            values (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13, $14, $15, $16
            )
            returning
              ${this.selectColumns(false)}
          `,
      supportsVerificationPhoto
        ? [
            input.eventId,
            input.sessionId,
            input.participantId,
            input.fullName,
            input.email,
            input.phone,
            input.scannedAt,
            input.latitude,
            input.longitude,
            input.accuracy,
            input.distanceFromVenue,
            input.isValid,
            input.invalidReason,
            input.qrNonce,
            input.ipAddress,
            input.deviceFingerprint,
            input.verificationPhotoDataUrl,
            input.verificationPhotoCapturedAt,
          ]
        : [
            input.eventId,
            input.sessionId,
            input.participantId,
            input.fullName,
            input.email,
            input.phone,
            input.scannedAt,
            input.latitude,
            input.longitude,
            input.accuracy,
            input.distanceFromVenue,
            input.isValid,
            input.invalidReason,
            input.qrNonce,
            input.ipAddress,
            input.deviceFingerprint,
          ],
    )) as AttendanceRecordRow[];

    return this.mapRow(rows[0]);
  }

  async findByParticipantAndSession(participantId: string, sessionId: string) {
    const selectColumns = this.selectColumns(
      await this.hasVerificationPhotoColumns(),
    );
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          ${selectColumns}
        from attendance_records
        where participant_id = $1
          and session_id = $2
        limit 1
      `,
      [participantId, sessionId],
    )) as AttendanceRecordRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findBySessionId(sessionId: string) {
    const selectColumns = this.selectColumns(
      await this.hasVerificationPhotoColumns(),
    );
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          ${selectColumns}
        from attendance_records
        where session_id = $1
        order by scanned_at desc
      `,
      [sessionId],
    )) as AttendanceRecordRow[];

    return rows.map((row) => this.mapRow(row));
  }

  async findByEventId(eventId: string) {
    const selectColumns = this.selectColumns(
      await this.hasVerificationPhotoColumns(),
    );
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          ${selectColumns}
        from attendance_records
        where event_id = $1
        order by scanned_at desc
      `,
      [eventId],
    )) as AttendanceRecordRow[];

    return rows.map((row) => this.mapRow(row));
  }

  async findAllByEvent({
    eventId,
    sessionId,
    search,
    isValid,
    page,
    limit,
  }: ListAttendanceRecordsInput) {
    const selectColumns = this.selectColumns(
      await this.hasVerificationPhotoColumns(),
    );
    const sql = getSql();
    const params: unknown[] = [eventId];
    const conditions = ['event_id = $1'];

    if (sessionId) {
      params.push(sessionId);
      conditions.push(`session_id = $${params.length}`);
    }

    if (typeof isValid === 'boolean') {
      params.push(isValid);
      conditions.push(`is_valid = $${params.length}`);
    }

    if (search?.trim()) {
      params.push(`%${escapeLikePattern(search.trim().toLowerCase())}%`);
      conditions.push(`
        lower(
          concat_ws(
            ' ',
            full_name,
            coalesce(email, ''),
            coalesce(phone, '')
          )
        ) like $${params.length} escape '\\'
      `);
    }

    const whereClause = `where ${conditions.join(' and ')}`;
    const offset = (page - 1) * limit;
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    const [itemRows, countRows] = await Promise.all([
      sql.query(
        `
          select
            ${selectColumns}
          from attendance_records
          ${whereClause}
          order by scanned_at desc
          limit $${limitIndex}
          offset $${offsetIndex}
        `,
        [...params, limit, offset],
      ) as unknown as Promise<AttendanceRecordRow[]>,
      sql.query(
        `
          select count(*)::int as total
          from attendance_records
          ${whereClause}
        `,
        params,
      ) as unknown as Promise<Array<{ total: number }>>,
    ]);

    const total = countRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: itemRows.map((row) => this.mapRow(row)),
      page,
      limit,
      total,
      totalPages,
    };
  }

  async findById(id: string): Promise<AttendanceRecordEntity | null> {
    if (!isUuidLike(id)) {
      return null;
    }

    const selectColumns = this.selectColumns(
      await this.hasVerificationPhotoColumns(),
    );
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          ${selectColumns}
        from attendance_records
        where id = $1
        limit 1
      `,
      [id],
    )) as AttendanceRecordRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async update(
    id: string,
    patch: UpdateAttendanceRecordInput,
  ): Promise<AttendanceRecordEntity | null> {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const selectColumns = this.selectColumns(
      await this.hasVerificationPhotoColumns(),
    );
    const sql = getSql();
    const rows = (await sql.query(
      `
        update attendance_records
        set
          is_valid = $2,
          invalid_reason = $3
        where id = $1
        returning
          ${selectColumns}
      `,
      [
        id,
        patch.isValid ?? current.isValid,
        patch.invalidReason ?? current.invalidReason,
      ],
    )) as AttendanceRecordRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  private mapRow(row: AttendanceRecordRow): AttendanceRecordEntity {
    return {
      ...row,
      scannedAt: toIsoString(row.scannedAt),
      verificationPhotoCapturedAt: toNullableIsoString(
        row.verificationPhotoCapturedAt,
      ),
      createdAt: toIsoString(row.createdAt),
    };
  }

  private async hasVerificationPhotoColumns() {
    if (!this.verificationPhotoColumnSupport) {
      this.verificationPhotoColumnSupport =
        this.detectVerificationPhotoColumns();
    }

    return this.verificationPhotoColumnSupport;
  }

  private async detectVerificationPhotoColumns() {
    const sql = getSql();
    const rows = (await sql.query(
      `
        select count(*)::int as total
        from information_schema.columns
        where table_name = 'attendance_records'
          and column_name in (
            'verification_photo_data_url',
            'verification_photo_captured_at'
          )
      `,
    )) as Array<{ total: number }>;

    return (rows[0]?.total ?? 0) === 2;
  }

  private selectColumns(includeVerificationPhoto: boolean) {
    return `
      id,
      event_id as "eventId",
      session_id as "sessionId",
      participant_id as "participantId",
      full_name as "fullName",
      email,
      phone,
      scanned_at as "scannedAt",
      latitude,
      longitude,
      accuracy,
      distance_from_venue as "distanceFromVenue",
      is_valid as "isValid",
      invalid_reason as "invalidReason",
      qr_nonce as "qrNonce",
      ip_address as "ipAddress",
      device_fingerprint as "deviceFingerprint",
      ${
        includeVerificationPhoto
          ? `verification_photo_data_url as "verificationPhotoDataUrl",
             verification_photo_captured_at as "verificationPhotoCapturedAt",`
          : `null::text as "verificationPhotoDataUrl",
             null::timestamp with time zone as "verificationPhotoCapturedAt",`
      }
      created_at as "createdAt"
    `;
  }
}
