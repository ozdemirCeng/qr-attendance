import { Injectable } from '@nestjs/common';

import { getSql, toIsoString } from '../../../common/database/neon';
import { AuditLogEntity } from '../audit.types';

type CreateAuditLogInput = Omit<AuditLogEntity, 'id' | 'createdAt'>;

type AuditLogRow = AuditLogEntity;

@Injectable()
export class AuditRepository {
  async create(input: CreateAuditLogInput): Promise<AuditLogEntity> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        insert into audit_logs (
          admin_id,
          action,
          entity_type,
          entity_id,
          metadata_json
        )
        values ($1, $2, $3, $4, $5)
        returning
          id,
          admin_id as "adminId",
          action,
          entity_type as "entityType",
          entity_id as "entityId",
          metadata_json as "metadataJson",
          created_at as "createdAt"
      `,
      [
        input.adminId,
        input.action,
        input.entityType,
        input.entityId,
        input.metadataJson,
      ],
    )) as AuditLogRow[];

    return this.mapRow(rows[0]);
  }

  async listLatest(limit = 100): Promise<AuditLogEntity[]> {
    const safeLimit = Math.max(1, Math.min(500, limit));
    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id,
          admin_id as "adminId",
          action,
          entity_type as "entityType",
          entity_id as "entityId",
          metadata_json as "metadataJson",
          created_at as "createdAt"
        from audit_logs
        order by created_at desc
        limit $1
      `,
      [safeLimit],
    )) as AuditLogRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: AuditLogRow): AuditLogEntity {
    return {
      ...row,
      createdAt: toIsoString(row.createdAt),
    };
  }
}
