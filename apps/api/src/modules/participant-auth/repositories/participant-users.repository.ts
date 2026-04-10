import { Injectable } from '@nestjs/common';

import {
  getSql,
  isUuidLike,
  toIsoString,
} from '../../../common/database/neon';
import { ParticipantUserEntity } from '../participant-auth.types';

type CreateInput = {
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
};

type UserRow = ParticipantUserEntity;

@Injectable()
export class ParticipantUsersRepository {
  async create(input: CreateInput): Promise<ParticipantUserEntity> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        INSERT INTO participant_users (name, email, phone, phone_normalized, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          name,
          email,
          phone,
          password_hash AS "passwordHash",
          created_at AS "createdAt"
      `,
      [
        input.name,
        input.email.toLowerCase(),
        input.phone,
        this.normalizePhone(input.phone),
        input.passwordHash,
      ],
    )) as UserRow[];

    return this.mapRow(rows[0]);
  }

  async findByEmail(email: string): Promise<ParticipantUserEntity | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;

    const sql = getSql();
    const rows = (await sql.query(
      `
        SELECT
          id, name, email, phone,
          password_hash AS "passwordHash",
          created_at AS "createdAt"
        FROM participant_users
        WHERE LOWER(email) = $1
        LIMIT 1
      `,
      [normalized],
    )) as UserRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findById(id: string): Promise<ParticipantUserEntity | null> {
    if (!isUuidLike(id)) return null;

    const sql = getSql();
    const rows = (await sql.query(
      `
        SELECT
          id, name, email, phone,
          password_hash AS "passwordHash",
          created_at AS "createdAt"
        FROM participant_users
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    )) as UserRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  private mapRow(row: UserRow): ParticipantUserEntity {
    return {
      ...row,
      createdAt: toIsoString(row.createdAt),
    };
  }

  private normalizePhone(value: string | null | undefined) {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    if (!digits) return null;
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
}
