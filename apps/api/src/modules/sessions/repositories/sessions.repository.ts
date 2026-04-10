import { Injectable } from '@nestjs/common';

import {
  getSql,
  isUuidLike,
  toIsoString,
  toNullableIsoString,
} from '../../../common/database/neon';
import { SessionEntity } from '../sessions.types';

type CreateSessionInput = {
  eventId: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

type UpdateSessionInput = Partial<Omit<CreateSessionInput, 'eventId'>>;

type SessionRow = SessionEntity;

@Injectable()
export class SessionsRepository {
  async create(input: CreateSessionInput): Promise<SessionEntity> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        insert into sessions (
          event_id,
          name,
          starts_at,
          ends_at
        )
        values ($1, $2, $3, $4)
        returning
          id,
          event_id as "eventId",
          name,
          starts_at as "startsAt",
          ends_at as "endsAt",
          created_at as "createdAt",
          deleted_at as "deletedAt"
      `,
      [input.eventId, input.name, input.startsAt, input.endsAt],
    )) as SessionRow[];

    return this.mapRow(rows[0]);
  }

  async findByEventId(eventId: string): Promise<SessionEntity[]> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          event_id as "eventId",
          name,
          starts_at as "startsAt",
          ends_at as "endsAt",
          created_at as "createdAt",
          deleted_at as "deletedAt"
        from sessions
        where event_id = $1
          and deleted_at is null
        order by starts_at asc
      `,
      [eventId],
    )) as SessionRow[];

    return rows.map((row) => this.mapRow(row));
  }

  async findActiveByEventId(
    eventId: string,
    nowIso = new Date().toISOString(),
  ): Promise<SessionEntity | null> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          event_id as "eventId",
          name,
          starts_at as "startsAt",
          ends_at as "endsAt",
          created_at as "createdAt",
          deleted_at as "deletedAt"
        from sessions
        where event_id = $1
          and deleted_at is null
          and starts_at <= $2
          and ends_at >= $2
        order by starts_at asc
        limit 1
      `,
      [eventId, nowIso],
    )) as SessionRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findAllActive(nowIso = new Date().toISOString()): Promise<SessionEntity[]> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          event_id as "eventId",
          name,
          starts_at as "startsAt",
          ends_at as "endsAt",
          created_at as "createdAt",
          deleted_at as "deletedAt"
        from sessions
        where deleted_at is null
          and starts_at <= $1
          and ends_at >= $1
        order by starts_at asc
      `,
      [nowIso],
    )) as SessionRow[];

    return rows.map((row) => this.mapRow(row));
  }

  async findByEventAndId(
    eventId: string,
    sessionId: string,
  ): Promise<SessionEntity | null> {
    if (!isUuidLike(eventId) || !isUuidLike(sessionId)) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          event_id as "eventId",
          name,
          starts_at as "startsAt",
          ends_at as "endsAt",
          created_at as "createdAt",
          deleted_at as "deletedAt"
        from sessions
        where id = $1
          and event_id = $2
          and deleted_at is null
        limit 1
      `,
      [sessionId, eventId],
    )) as SessionRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findById(sessionId: string): Promise<SessionEntity | null> {
    if (!isUuidLike(sessionId)) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          event_id as "eventId",
          name,
          starts_at as "startsAt",
          ends_at as "endsAt",
          created_at as "createdAt",
          deleted_at as "deletedAt"
        from sessions
        where id = $1
          and deleted_at is null
        limit 1
      `,
      [sessionId],
    )) as SessionRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async update(
    eventId: string,
    sessionId: string,
    patch: UpdateSessionInput,
  ): Promise<SessionEntity | null> {
    const current = await this.findByEventAndId(eventId, sessionId);

    if (!current) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        update sessions
        set
          name = $3,
          starts_at = $4,
          ends_at = $5
        where id = $1
          and event_id = $2
          and deleted_at is null
        returning
          id,
          event_id as "eventId",
          name,
          starts_at as "startsAt",
          ends_at as "endsAt",
          created_at as "createdAt",
          deleted_at as "deletedAt"
      `,
      [
        sessionId,
        eventId,
        patch.name ?? current.name,
        patch.startsAt ?? current.startsAt,
        patch.endsAt ?? current.endsAt,
      ],
    )) as SessionRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async remove(
    eventId: string,
    sessionId: string,
  ): Promise<SessionEntity | null> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        update sessions
        set deleted_at = now()
        where id = $1
          and event_id = $2
          and deleted_at is null
        returning
          id,
          event_id as "eventId",
          name,
          starts_at as "startsAt",
          ends_at as "endsAt",
          created_at as "createdAt",
          deleted_at as "deletedAt"
      `,
      [sessionId, eventId],
    )) as SessionRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  private mapRow(row: SessionRow): SessionEntity {
    return {
      ...row,
      startsAt: toIsoString(row.startsAt),
      endsAt: toIsoString(row.endsAt),
      createdAt: toIsoString(row.createdAt),
      deletedAt: toNullableIsoString(row.deletedAt),
    };
  }
}
