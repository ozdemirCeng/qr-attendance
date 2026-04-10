import { Injectable } from '@nestjs/common';

import {
  getSql,
  isUuidLike,
  toIsoString,
  toNullableIsoString,
} from '../../../common/database/neon';
import { EventEntity, EventStatus } from '../events.types';

type CreateEventInput = {
  name: string;
  description: string | null;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  createdBy?: string | null;
};

type UpdateEventInput = Partial<Omit<CreateEventInput, 'createdBy'>>;

type PaginationInput = {
  page: number;
  limit: number;
};

type EventRow = EventEntity;
type EventStatsRow = {
  total: number;
  active: number;
  completed: number;
  draft: number;
  archived: number;
};

@Injectable()
export class EventsRepository {
  async create(input: CreateEventInput): Promise<EventEntity> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        insert into events (
          name,
          description,
          location_name,
          latitude,
          longitude,
          radius_meters,
          starts_at,
          ends_at,
          created_by,
          status
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning
          id,
          name,
          description,
          location_name as "locationName",
          latitude,
          longitude,
          radius_meters as "radiusMeters",
          starts_at as "startsAt",
          ends_at as "endsAt",
          status,
          created_at as "createdAt",
          deleted_at as "deletedAt"
      `,
      [
        input.name,
        input.description,
        input.locationName,
        input.latitude,
        input.longitude,
        input.radiusMeters,
        input.startsAt,
        input.endsAt,
        input.createdBy ?? 'system',
        input.status,
      ],
    )) as EventRow[];

    return this.mapRow(rows[0]);
  }

  async findAll({ page, limit }: PaginationInput) {
    const sql = getSql();
    const offset = (page - 1) * limit;
    const [itemRows, countRows] = await Promise.all([
      sql.query(
        `
          select
            id,
            name,
            description,
            location_name as "locationName",
            latitude,
            longitude,
            radius_meters as "radiusMeters",
            starts_at as "startsAt",
            ends_at as "endsAt",
            status,
            created_at as "createdAt",
            deleted_at as "deletedAt"
          from events
          where deleted_at is null
          order by created_at desc
          limit $1
          offset $2
        `,
        [limit, offset],
      ) as unknown as Promise<EventRow[]>,
      sql.query(
        `
          select count(*)::int as total
          from events
          where deleted_at is null
        `,
      ) as unknown as Promise<Array<{ total: number }>>,
    ]);

    const total = countRows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: itemRows.map((row) => this.mapRow(row)),
      total,
      totalPages,
      page,
      limit,
    };
  }

  async getStats() {
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          count(*)::int as total,
          count(*) filter (where status = 'active')::int as active,
          count(*) filter (where status = 'completed')::int as completed,
          count(*) filter (where status = 'draft')::int as draft,
          count(*) filter (where status = 'archived')::int as archived
        from events
        where deleted_at is null
      `,
    )) as EventStatsRow[];

    return (
      rows[0] ?? {
        total: 0,
        active: 0,
        completed: 0,
        draft: 0,
        archived: 0,
      }
    );
  }

  async findById(id: string): Promise<EventEntity | null> {
    if (!isUuidLike(id)) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          name,
          description,
          location_name as "locationName",
          latitude,
          longitude,
          radius_meters as "radiusMeters",
          starts_at as "startsAt",
          ends_at as "endsAt",
          status,
          created_at as "createdAt",
          deleted_at as "deletedAt"
        from events
        where id = $1
          and deleted_at is null
        limit 1
      `,
      [id],
    )) as EventRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async update(
    id: string,
    patch: UpdateEventInput,
  ): Promise<EventEntity | null> {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        update events
        set
          name = $2,
          description = $3,
          location_name = $4,
          latitude = $5,
          longitude = $6,
          radius_meters = $7,
          starts_at = $8,
          ends_at = $9,
          status = $10
        where id = $1
          and deleted_at is null
        returning
          id,
          name,
          description,
          location_name as "locationName",
          latitude,
          longitude,
          radius_meters as "radiusMeters",
          starts_at as "startsAt",
          ends_at as "endsAt",
          status,
          created_at as "createdAt",
          deleted_at as "deletedAt"
      `,
      [
        id,
        patch.name ?? current.name,
        patch.description ?? current.description,
        patch.locationName ?? current.locationName,
        patch.latitude ?? current.latitude,
        patch.longitude ?? current.longitude,
        patch.radiusMeters ?? current.radiusMeters,
        patch.startsAt ?? current.startsAt,
        patch.endsAt ?? current.endsAt,
        patch.status ?? current.status,
      ],
    )) as EventRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async softDelete(id: string): Promise<EventEntity | null> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        update events
        set
          status = 'archived',
          deleted_at = now()
        where id = $1
          and deleted_at is null
        returning
          id,
          name,
          description,
          location_name as "locationName",
          latitude,
          longitude,
          radius_meters as "radiusMeters",
          starts_at as "startsAt",
          ends_at as "endsAt",
          status,
          created_at as "createdAt",
          deleted_at as "deletedAt"
      `,
      [id],
    )) as EventRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  private mapRow(row: EventRow): EventEntity {
    return {
      ...row,
      startsAt: toIsoString(row.startsAt),
      endsAt: toIsoString(row.endsAt),
      createdAt: toIsoString(row.createdAt),
      deletedAt: toNullableIsoString(row.deletedAt),
    };
  }
}
