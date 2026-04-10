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
  avatarDataUrl?: string | null;
  passwordHash: string;
};

type UserRow = ParticipantUserEntity;

@Injectable()
export class ParticipantUsersRepository {
  private avatarColumnSupport: Promise<boolean> | null = null;

  async create(input: CreateInput): Promise<ParticipantUserEntity> {
    const supportsAvatarDataUrl = await this.hasAvatarDataUrlColumn();
    const sql = getSql();
    const rows = (await sql.query(
      supportsAvatarDataUrl
        ? `
            INSERT INTO participant_users (
              name,
              email,
              phone,
              phone_normalized,
              avatar_data_url,
              password_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
              id,
              name,
              email,
              phone,
              avatar_data_url AS "avatarDataUrl",
              password_hash AS "passwordHash",
              created_at AS "createdAt"
          `
        : `
            INSERT INTO participant_users (
              name,
              email,
              phone,
              phone_normalized,
              password_hash
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING
              id,
              name,
              email,
              phone,
              NULL::text AS "avatarDataUrl",
              password_hash AS "passwordHash",
              created_at AS "createdAt"
          `,
      supportsAvatarDataUrl
        ? [
            input.name,
            input.email.toLowerCase(),
            input.phone,
            this.normalizePhone(input.phone),
            input.avatarDataUrl ?? null,
            input.passwordHash,
          ]
        : [
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

    const supportsAvatarDataUrl = await this.hasAvatarDataUrlColumn();
    const sql = getSql();
    const rows = (await sql.query(
      supportsAvatarDataUrl
        ? `
            SELECT
              id, name, email, phone,
              avatar_data_url AS "avatarDataUrl",
              password_hash AS "passwordHash",
              created_at AS "createdAt"
            FROM participant_users
            WHERE LOWER(email) = $1
            LIMIT 1
          `
        : `
            SELECT
              id, name, email, phone,
              NULL::text AS "avatarDataUrl",
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

  async findByPhone(phone: string): Promise<ParticipantUserEntity | null> {
    const normalizedPhone = this.normalizePhone(phone);

    if (!normalizedPhone) {
      return null;
    }

    const supportsAvatarDataUrl = await this.hasAvatarDataUrlColumn();
    const sql = getSql();
    const rows = (await sql.query(
      supportsAvatarDataUrl
        ? `
            SELECT
              id, name, email, phone,
              avatar_data_url AS "avatarDataUrl",
              password_hash AS "passwordHash",
              created_at AS "createdAt"
            FROM participant_users
            WHERE phone_normalized = $1
            LIMIT 1
          `
        : `
            SELECT
              id, name, email, phone,
              NULL::text AS "avatarDataUrl",
              password_hash AS "passwordHash",
              created_at AS "createdAt"
            FROM participant_users
            WHERE phone_normalized = $1
            LIMIT 1
          `,
      [normalizedPhone],
    )) as UserRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findByIdentity(
    identity: string,
  ): Promise<ParticipantUserEntity | null> {
    const normalizedIdentity = identity.trim();

    if (!normalizedIdentity) {
      return null;
    }

    if (normalizedIdentity.includes('@')) {
      return this.findByEmail(normalizedIdentity);
    }

    return this.findByPhone(normalizedIdentity);
  }

  async findById(id: string): Promise<ParticipantUserEntity | null> {
    if (!isUuidLike(id)) return null;

    const supportsAvatarDataUrl = await this.hasAvatarDataUrlColumn();
    const sql = getSql();
    const rows = (await sql.query(
      supportsAvatarDataUrl
        ? `
            SELECT
              id, name, email, phone,
              avatar_data_url AS "avatarDataUrl",
              password_hash AS "passwordHash",
              created_at AS "createdAt"
            FROM participant_users
            WHERE id = $1
            LIMIT 1
          `
        : `
            SELECT
              id, name, email, phone,
              NULL::text AS "avatarDataUrl",
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

  async update(
    id: string,
    patch: {
      name?: string;
      email?: string;
      phone?: string | null;
      avatarDataUrl?: string | null;
    },
  ): Promise<ParticipantUserEntity | null> {
    if (!isUuidLike(id)) return null;

    const supportsAvatarDataUrl = await this.hasAvatarDataUrlColumn();
    const sets: string[] = [];
    const params: unknown[] = [id];
    let paramIndex = 2;

    if (patch.name !== undefined) {
      sets.push(`name = $${paramIndex}`);
      params.push(patch.name);
      paramIndex++;
    }
    if (patch.email !== undefined) {
      sets.push(`email = $${paramIndex}`);
      params.push(patch.email.toLowerCase());
      paramIndex++;
    }
    if (patch.phone !== undefined) {
      sets.push(`phone = $${paramIndex}`);
      params.push(patch.phone);
      paramIndex++;
      sets.push(`phone_normalized = $${paramIndex}`);
      params.push(this.normalizePhone(patch.phone));
      paramIndex++;
    }
    if (supportsAvatarDataUrl && patch.avatarDataUrl !== undefined) {
      sets.push(`avatar_data_url = $${paramIndex}`);
      params.push(patch.avatarDataUrl);
      paramIndex++;
    }

    if (sets.length === 0) return this.findById(id);

    const sql = getSql();
    const rows = (await sql.query(
      supportsAvatarDataUrl
        ? `
            UPDATE participant_users
            SET ${sets.join(', ')}
            WHERE id = $1
            RETURNING
              id, name, email, phone,
              avatar_data_url AS "avatarDataUrl",
              password_hash AS "passwordHash",
              created_at AS "createdAt"
          `
        : `
            UPDATE participant_users
            SET ${sets.join(', ')}
            WHERE id = $1
            RETURNING
              id, name, email, phone,
              NULL::text AS "avatarDataUrl",
              password_hash AS "passwordHash",
              created_at AS "createdAt"
          `,
      params,
    )) as UserRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async updatePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<boolean> {
    if (!isUuidLike(id)) return false;

    const sql = getSql();
    const rows = (await sql.query(
      `UPDATE participant_users SET password_hash = $2 WHERE id = $1 RETURNING id`,
      [id, passwordHash],
    )) as Array<{ id: string }>;

    return rows.length > 0;
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

  private async hasAvatarDataUrlColumn() {
    if (!this.avatarColumnSupport) {
      this.avatarColumnSupport = this.detectAvatarDataUrlColumn();
    }

    return this.avatarColumnSupport;
  }

  private async detectAvatarDataUrlColumn() {
    const sql = getSql();
    const rows = (await sql.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'participant_users'
            AND column_name = 'avatar_data_url'
        ) AS "exists"
      `,
    )) as Array<{ exists: boolean }>;

    return rows[0]?.exists ?? false;
  }
}
