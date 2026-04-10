import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

import { AttendanceRecordsRepository } from '../../attendance/repositories/attendance-records.repository';
import { EventsRepository } from '../../events/repositories/events.repository';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository';
import {
  ExportJobRecord,
  ExportJobsRepository,
} from '../repositories/export-jobs.repository';

type RegistrationType = 'walkIn' | 'registered';

type ExportJobRow = {
  fullName: string;
  email: string | null;
  phone: string | null;
  scannedAt: string;
  distanceFromVenue: number | null;
  registrationType: RegistrationType;
};

type ExportJobPayload = {
  exportId: string;
  eventId: string;
  eventName: string;
  requestedAt: string;
  rows: ExportJobRow[];
};

type ExportJobResult = {
  filePath: string;
  downloadUrl: string;
};

@Injectable()
export class ExportsService implements OnModuleDestroy {
  private readonly dateFormatter = new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  private readonly timeFormatter = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  private exportQueue:
    | Queue<ExportJobPayload, ExportJobResult>
    | null
    | undefined;

  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly attendanceRecordsRepository: AttendanceRecordsRepository,
    private readonly participantsRepository: ParticipantsRepository,
    private readonly exportJobsRepository: ExportJobsRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleDestroy() {
    if (this.exportQueue) {
      await this.exportQueue.close();
    }
  }

  async requestAttendanceExport(eventId: string) {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    const exportJob = await this.exportJobsRepository.create(eventId);
    const rows = (
      await this.attendanceRecordsRepository.findByEventId(eventId)
    ).map(async (record) => ({
      fullName: record.fullName,
      email: record.email,
      phone: record.phone,
      scannedAt: record.scannedAt,
      distanceFromVenue: record.distanceFromVenue,
      registrationType: await this.resolveRegistrationType(
        record.participantId,
      ),
    }));
    const payload: ExportJobPayload = {
      exportId: exportJob.exportId,
      eventId,
      eventName: event.name,
      requestedAt: new Date().toISOString(),
      rows: await Promise.all(rows),
    };
    const queue = this.getExportQueue();

    if (queue) {
      try {
        await queue.add('attendance-export', payload, {
          jobId: exportJob.exportId,
          removeOnComplete: false,
          removeOnFail: false,
        });
      } catch {
        await this.disableExportQueue();
        void this.processExportJob(exportJob.exportId, payload);
      }
    } else {
      void this.processExportJob(exportJob.exportId, payload);
    }

    return {
      success: true,
      data: {
        exportId: exportJob.exportId,
        message: 'Hazirlaniyor...',
      },
    };
  }

  async getStatus(exportId: string) {
    const job = await this.synchronizeQueuedJob(
      await this.getJobOrThrow(exportId),
    );

    return {
      success: true,
      data: {
        exportId,
        status: job.status,
        progress: job.progress,
        downloadUrl: job.downloadUrl,
        errorMessage: job.errorMessage,
      },
    };
  }

  async getDownloadFilePath(exportId: string) {
    const job = await this.synchronizeQueuedJob(
      await this.getJobOrThrow(exportId),
    );

    if (job.status !== 'ready') {
      throw new BadRequestException('Export henuz hazir degil.');
    }

    if (!job.filePath) {
      throw new NotFoundException('Export dosyasi bulunamadi.');
    }

    return job.filePath;
  }

  private getExportQueue() {
    if (this.exportQueue !== undefined) {
      return this.exportQueue;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.exportQueue = null;
      return this.exportQueue;
    }

    const parsed = new URL(redisUrl);
    this.exportQueue = new Queue('export.queue', {
      connection: {
        host: parsed.hostname,
        port: Number(parsed.port || '6379'),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
      },
    });

    return this.exportQueue;
  }

  private async disableExportQueue() {
    if (this.exportQueue) {
      await this.exportQueue.close();
    }

    this.exportQueue = null;
  }

  private async getJobOrThrow(exportId: string) {
    const job = await this.exportJobsRepository.findById(exportId);

    if (!job) {
      throw new NotFoundException('Export kaydi bulunamadi.');
    }

    return job;
  }

  private async synchronizeQueuedJob(jobRecord: ExportJobRecord) {
    const queue = this.getExportQueue();

    if (!queue) {
      return jobRecord;
    }

    try {
      const queuedJob = await queue.getJob(jobRecord.exportId);

      if (!queuedJob) {
        return jobRecord;
      }

      const state = await queuedJob.getState();
      const progress = this.normalizeProgress(
        queuedJob.progress,
        jobRecord.progress,
      );

      if (state === 'completed') {
        const result = queuedJob.returnvalue as ExportJobResult | undefined;

        if (!result?.filePath) {
          return jobRecord;
        }

        return (
          (await this.updateJob(jobRecord.exportId, {
            status: 'ready',
            progress: 100,
            filePath: result.filePath,
            downloadUrl: result.downloadUrl,
            errorMessage: null,
            completedAt: new Date().toISOString(),
          })) ?? jobRecord
        );
      }

      if (state === 'failed') {
        return (
          (await this.updateJob(jobRecord.exportId, {
            status: 'failed',
            progress: 100,
            filePath: null,
            downloadUrl: null,
            errorMessage:
              queuedJob.failedReason || 'Export dosyasi olusturulamadi.',
            completedAt: new Date().toISOString(),
          })) ?? jobRecord
        );
      }

      if (state === 'active' || state === 'prioritized') {
        return (
          (await this.updateJob(jobRecord.exportId, {
            status: 'processing',
            progress,
            errorMessage: null,
          })) ?? jobRecord
        );
      }

      if (
        state === 'waiting' ||
        state === 'delayed' ||
        state === 'waiting-children'
      ) {
        return (
          (await this.updateJob(jobRecord.exportId, {
            status: 'pending',
            progress: Math.max(progress, 5),
          })) ?? jobRecord
        );
      }
    } catch {
      await this.disableExportQueue();
    }

    return jobRecord;
  }

  private async processExportJob(exportId: string, payload: ExportJobPayload) {
    await this.updateJob(exportId, {
      status: 'processing',
      progress: 25,
      errorMessage: null,
    });

    try {
      const result = await this.generateAttendanceExportFile(payload);

      await this.updateJob(exportId, {
        status: 'ready',
        progress: 100,
        filePath: result.filePath,
        downloadUrl: result.downloadUrl,
        errorMessage: null,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.message.trim()
          ? `Export dosyasi olusturulamadi: ${error.message}`
          : 'Export dosyasi olusturulamadi.';

      await this.updateJob(exportId, {
        status: 'failed',
        progress: 100,
        filePath: null,
        downloadUrl: null,
        errorMessage: reason,
        completedAt: new Date().toISOString(),
      });
    }
  }

  private async updateJob(
    exportId: string,
    patch: Partial<
      Omit<ExportJobRecord, 'exportId' | 'eventId' | 'createdAt' | 'updatedAt'>
    >,
  ) {
    await this.exportJobsRepository.update(exportId, patch);

    return this.exportJobsRepository.findById(exportId);
  }

  private normalizeProgress(value: unknown, fallback: number) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private async generateAttendanceExportFile(
    payload: ExportJobPayload,
  ): Promise<ExportJobResult> {
    const outputDirectory = join(
      tmpdir(),
      'qr-attendance',
      'exports',
      payload.eventId,
    );
    await mkdir(outputDirectory, { recursive: true });

    const fileName = `${this.sanitizeFileName(payload.eventName)}-${Date.now()}.xlsx`;
    const filePath = join(outputDirectory, fileName);

    const worksheetRows = payload.rows.map((row) => {
      const scannedAt = new Date(row.scannedAt);
      const hasValidDate = !Number.isNaN(scannedAt.getTime());

      return {
        'Ad Soyad': row.fullName,
        'E-posta': row.email ?? '-',
        Telefon: row.phone ?? '-',
        'Katilim Tarihi': hasValidDate
          ? this.dateFormatter.format(scannedAt)
          : '-',
        'Katilim Saati': hasValidDate
          ? this.timeFormatter.format(scannedAt)
          : '-',
        'Konum Gecerli': row.distanceFromVenue !== null ? 'Evet' : 'Hayir',
        'Mesafe (m)':
          typeof row.distanceFromVenue === 'number'
            ? Math.round(row.distanceFromVenue)
            : '-',
        'Kayit Turu': row.registrationType === 'walkIn' ? 'Walk-in' : 'Kayitli',
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetRows);

    this.styleHeaderRow(worksheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Katilim');
    XLSX.writeFile(workbook, filePath, {
      bookType: 'xlsx',
    });

    return {
      filePath,
      downloadUrl: `/exports/${payload.exportId}/download`,
    };
  }

  private styleHeaderRow(worksheet: XLSX.WorkSheet) {
    if (!worksheet['!ref']) {
      return;
    }

    const range = XLSX.utils.decode_range(worksheet['!ref']);

    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: column });
      const cell = worksheet[cellAddress] as
        | (XLSX.CellObject & { s?: unknown })
        | undefined;

      if (!cell) {
        continue;
      }

      cell.s = {
        font: { bold: true },
        fill: {
          patternType: 'solid',
          fgColor: { rgb: 'D4D4D8' },
        },
      };
    }
  }

  private sanitizeFileName(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'attendance-export';
  }

  private async resolveRegistrationType(
    participantId: string | null,
  ): Promise<RegistrationType> {
    if (!participantId) {
      return 'walkIn';
    }

    const participant =
      await this.participantsRepository.findById(participantId);

    if (!participant || participant.source === 'self_registered') {
      return 'walkIn';
    }

    return 'registered';
  }
}
