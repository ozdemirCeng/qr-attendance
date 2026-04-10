import { Injectable } from '@nestjs/common';

import {
  getSql,
  isUuidLike,
  toIsoString,
  toNullableIsoString,
} from '../../../common/database/neon';

export type ExportStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type ExportJobRecord = {
  exportId: string;
  eventId: string;
  status: ExportStatus;
  progress: number;
  filePath: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type ExportJobRow = {
  exportId: string;
  eventId: string;
  status: ExportStatus;
  progress: number;
  filePath: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

@Injectable()
export class ExportJobsRepository {
  async create(eventId: string): Promise<ExportJobRecord> {
    const sql = getSql();
    const rows = (await sql.query(
      `
        insert into export_jobs (
          event_id,
          status,
          progress
        )
        values ($1, 'pending', 5)
        returning
          id as "exportId",
          event_id as "eventId",
          status,
          progress,
          file_path as "filePath",
          download_url as "downloadUrl",
          error_message as "errorMessage",
          created_at as "createdAt",
          updated_at as "updatedAt",
          completed_at as "completedAt"
      `,
      [eventId],
    )) as ExportJobRow[];

    return this.mapRow(rows[0]);
  }

  async findById(exportId: string): Promise<ExportJobRecord | null> {
    if (!isUuidLike(exportId)) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        select
          id as "exportId",
          event_id as "eventId",
          status,
          progress,
          file_path as "filePath",
          download_url as "downloadUrl",
          error_message as "errorMessage",
          created_at as "createdAt",
          updated_at as "updatedAt",
          completed_at as "completedAt"
        from export_jobs
        where id = $1
        limit 1
      `,
      [exportId],
    )) as ExportJobRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async update(
    exportId: string,
    patch: Partial<
      Omit<ExportJobRecord, 'exportId' | 'eventId' | 'createdAt' | 'updatedAt'>
    >,
  ) {
    const current = await this.findById(exportId);

    if (!current) {
      return null;
    }

    const sql = getSql();
    const rows = (await sql.query(
      `
        update export_jobs
        set
          status = $2,
          progress = $3,
          file_path = $4,
          download_url = $5,
          error_message = $6,
          completed_at = $7,
          updated_at = now()
        where id = $1
        returning
          id as "exportId",
          event_id as "eventId",
          status,
          progress,
          file_path as "filePath",
          download_url as "downloadUrl",
          error_message as "errorMessage",
          created_at as "createdAt",
          updated_at as "updatedAt",
          completed_at as "completedAt"
      `,
      [
        exportId,
        patch.status ?? current.status,
        patch.progress ?? current.progress,
        patch.filePath ?? current.filePath,
        patch.downloadUrl ?? current.downloadUrl,
        patch.errorMessage ?? current.errorMessage,
        patch.completedAt ?? current.completedAt,
      ],
    )) as ExportJobRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  private mapRow(row: ExportJobRow): ExportJobRecord {
    return {
      ...row,
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
      completedAt: toNullableIsoString(row.completedAt),
    };
  }
}
