import { Injectable } from '@nestjs/common';

import {
  escapeLikePattern,
  getSql,
  isUuidLike,
  isDatabaseUniqueViolation,
  toIsoString,
} from '../../../common/database/neon';
import { ParticipantEntity, ParticipantSource } from '../participants.types';

type CreateParticipantInput = {
  eventId: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: ParticipantSource;
  externalId: string | null;
};

type CsvParticipantInput = {
  name: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
};

type FindByEventInput = {
  eventId: string;
  page: number;
  limit: number;
  search?: string;
};

type ParticipantRow = ParticipantEntity;

@Injectable()
export class ParticipantsRepository {
  async create(input: CreateParticipantInput): Promise<ParticipantEntity> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        insert into participants (
          event_id,
          name,
          email,
          phone,
          phone_normalized,
          source,
          external_id
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning
          id,
          event_id as "eventId",
          name,
          email,
          phone,
          source,
          external_id as "externalId",
          created_at as "createdAt"
      `,
      [
        input.eventId,
        input.name,
        input.email,
        input.phone,
        this.normalizePhone(input.phone),
        input.source,
        input.externalId,
      ],
    )) as ParticipantRow[];

    return this.mapRow(rows[0]);
  }

  async findAllByEvent({ eventId, page, limit, search }: FindByEventInput) {
    const sql = getSql();
    const offset = (page - 1) * limit;
    const normalizedSearch = search?.trim();

    const params: unknown[] = [eventId];
    let whereClause = 'where event_id = $1';

    if (normalizedSearch) {
      const escaped = `%${escapeLikePattern(normalizedSearch.toLowerCase())}%`;
      params.push(escaped);
      whereClause += `
        and lower(
          concat_ws(
            ' ',
            name,
            coalesce(email, ''),
            coalesce(phone, ''),
            coalesce(external_id, '')
          )
        ) like $2 escape '\\'
      `;
    }

    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    const [itemRows, countRows] = await Promise.all([
      sql.query(
        `
          select
            id,
            event_id as "eventId",
            name,
            email,
            phone,
            source,
            external_id as "externalId",
            created_at as "createdAt"
          from participants
          ${whereClause}
          order by created_at desc
          limit $${limitIndex}
          offset $${offsetIndex}
        `,
        [...params, limit, offset],
      ) as unknown as Promise<ParticipantRow[]>,
      sql.query(
        `
          select count(*)::int as total
          from participants
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

  async findByEventAndId(
    eventId: string,
    participantId: string,
  ): Promise<ParticipantEntity | null> {
    if (!isUuidLike(eventId) || !isUuidLike(participantId)) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          event_id as "eventId",
          name,
          email,
          phone,
          source,
          external_id as "externalId",
          created_at as "createdAt"
        from participants
        where id = $1
          and event_id = $2
        limit 1
      `,
      [participantId, eventId],
    )) as ParticipantRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByEventAndEmail(
    eventId: string,
    email: string,
  ): Promise<ParticipantEntity | null> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          event_id as "eventId",
          name,
          email,
          phone,
          source,
          external_id as "externalId",
          created_at as "createdAt"
        from participants
        where event_id = $1
          and lower(email) = $2
        limit 1
      `,
      [eventId, normalizedEmail],
    )) as ParticipantRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByEventAndPhone(
    eventId: string,
    phone: string,
  ): Promise<ParticipantEntity | null> {
    const normalizedPhone = this.normalizePhone(phone);

    if (!normalizedPhone) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          event_id as "eventId",
          name,
          email,
          phone,
          source,
          external_id as "externalId",
          created_at as "createdAt"
        from participants
        where event_id = $1
          and phone_normalized = $2
        limit 1
      `,
      [eventId, normalizedPhone],
    )) as ParticipantRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findById(participantId: string): Promise<ParticipantEntity | null> {
    if (!isUuidLike(participantId)) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          event_id as "eventId",
          name,
          email,
          phone,
          source,
          external_id as "externalId",
          created_at as "createdAt"
        from participants
        where id = $1
        limit 1
      `,
      [participantId],
    )) as ParticipantRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async remove(
    eventId: string,
    participantId: string,
  ): Promise<ParticipantEntity | null> {
    if (!isUuidLike(eventId) || !isUuidLike(participantId)) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        delete from participants
        where id = $1
          and event_id = $2
        returning
          id,
          event_id as "eventId",
          name,
          email,
          phone,
          source,
          external_id as "externalId",
          created_at as "createdAt"
      `,
      [participantId, eventId],
    )) as ParticipantRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async bulkUpsertFromCsv(
    eventId: string,
    rows: CsvParticipantInput[],
  ): Promise<ParticipantEntity[]> {
    const upserted: ParticipantEntity[] = [];

    for (const row of rows) {
      const normalizedEmail = row.email?.toLowerCase() ?? null;
      const existing = await this.findExistingForUpsert(eventId, {
        email: normalizedEmail,
        phone: row.phone,
      });

      if (existing) {
        const updated = await this.update(existing.id, {
          name: row.name,
          email: normalizedEmail,
          phone: row.phone,
          source: 'csv',
          externalId: row.externalId,
        });

        if (updated) {
          upserted.push(updated);
          continue;
        }
      }

      try {
        const created = await this.create({
          eventId,
          name: row.name,
          email: normalizedEmail,
          phone: row.phone,
          source: 'csv',
          externalId: row.externalId,
        });

        upserted.push(created);
      } catch (error) {
        if (!isDatabaseUniqueViolation(error)) {
          throw error;
        }

        const recoveredExisting = await this.findExistingForUpsert(eventId, {
          email: normalizedEmail,
          phone: row.phone,
        });

        if (!recoveredExisting) {
          throw error;
        }

        const recoveredUpdated = await this.update(recoveredExisting.id, {
          name: row.name,
          email: normalizedEmail,
          phone: row.phone,
          source: 'csv',
          externalId: row.externalId,
        });

        if (recoveredUpdated) {
          upserted.push(recoveredUpdated);
        }
      }
    }

    return upserted;
  }

  private async update(
    participantId: string,
    patch: {
      name: string;
      email: string | null;
      phone: string | null;
      source: ParticipantSource;
      externalId: string | null;
    },
  ) {
    const sql = getSql();
    const rows = (await sql.query(
      `
        update participants
        set
          name = $2,
          email = $3,
          phone = $4,
          phone_normalized = $5,
          source = $6,
          external_id = $7
        where id = $1
        returning
          id,
          event_id as "eventId",
          name,
          email,
          phone,
          source,
          external_id as "externalId",
          created_at as "createdAt"
      `,
      [
        participantId,
        patch.name,
        patch.email,
        patch.phone,
        this.normalizePhone(patch.phone),
        patch.source,
        patch.externalId,
      ],
    )) as ParticipantRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  private async findExistingForUpsert(
    eventId: string,
    input: { email: string | null; phone: string | null },
  ) {
    if (input.email) {
      const byEmail = await this.findByEventAndEmail(eventId, input.email);
      if (byEmail) {
        return byEmail;
      }
    }

    if (input.phone) {
      const byPhone = await this.findByEventAndPhone(eventId, input.phone);
      if (byPhone) {
        return byPhone;
      }
    }

    return null;
  }

  private mapRow(row: ParticipantRow): ParticipantEntity {
    return {
      ...row,
      createdAt: toIsoString(row.createdAt),
    };
  }

  private normalizePhone(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const digits = value.replace(/\D/g, '');

    if (!digits) {
      return null;
    }

    return digits.length > 10 ? digits.slice(-10) : digits;
  }
}
