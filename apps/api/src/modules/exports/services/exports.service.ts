import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { AttendanceRecordsRepository } from '../../attendance/repositories/attendance-records.repository';
import { EventsRepository } from '../../events/repositories/events.repository';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository';

type ExportStatus = 'pending' | 'processing' | 'ready' | 'failed';
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

type ExportJobRecord = {
  exportId: string;
  status: ExportStatus;
  progress: number;
  filePath: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
};

@Injectable()
export class ExportsService {
  private readonly jobs = new Map<string, ExportJobRecord>();
  private readonly dateFormatter = new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  private readonly timeFormatter = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly attendanceRecordsRepository: AttendanceRecordsRepository,
    private readonly participantsRepository: ParticipantsRepository,
  ) {}

  async requestAttendanceExport(eventId: string) {
    const event = this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    const exportId = crypto.randomUUID();
    const rows = this.attendanceRecordsRepository
      .findByEventId(eventId)
      .map((record) => ({
        fullName: record.fullName,
        email: record.email,
        phone: record.phone,
        scannedAt: record.scannedAt,
        distanceFromVenue: record.distanceFromVenue,
        registrationType: this.resolveRegistrationType(record.participantId),
      }));

    this.jobs.set(exportId, {
      exportId,
      status: 'processing',
      progress: 20,
      filePath: null,
      downloadUrl: null,
      errorMessage: null,
    });

    try {
      const result = await this.generateAttendanceExportFile({
        exportId,
        eventId,
        eventName: event.name,
        requestedAt: new Date().toISOString(),
        rows,
      });

      this.jobs.set(exportId, {
        exportId,
        status: 'ready',
        progress: 100,
        filePath: result.filePath,
        downloadUrl: result.downloadUrl,
        errorMessage: null,
      });
    } catch {
      this.jobs.set(exportId, {
        exportId,
        status: 'failed',
        progress: 100,
        filePath: null,
        downloadUrl: null,
        errorMessage: 'Export dosyasi olusturulamadi.',
      });
    }

    return {
      success: true,
      data: {
        exportId,
        message: 'Export istegi alindi.',
      },
    };
  }

  getStatus(exportId: string) {
    const job = this.getJobOrThrow(exportId);

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

  getDownloadFilePath(exportId: string) {
    const job = this.getJobOrThrow(exportId);

    if (job.status !== 'ready') {
      throw new BadRequestException('Export henuz hazir degil.');
    }

    if (!job.filePath) {
      throw new NotFoundException('Export dosyasi bulunamadi.');
    }

    return job.filePath;
  }

  private getJobOrThrow(exportId: string) {
    const job = this.jobs.get(exportId) ?? null;

    if (!job) {
      throw new NotFoundException('Export kaydi bulunamadi.');
    }

    return job;
  }

  private async generateAttendanceExportFile(
    payload: ExportJobPayload,
  ): Promise<ExportJobResult> {
    const outputDirectory = resolve(
      process.cwd(),
      'tmp',
      'exports',
      payload.eventId,
    );
    await mkdir(outputDirectory, { recursive: true });

    const fileName = `${this.sanitizeFileName(payload.eventName)}-${Date.now()}.csv`;
    const filePath = join(outputDirectory, fileName);

    const header = [
      'Ad Soyad',
      'E-posta',
      'Telefon',
      'Katilim Tarihi',
      'Katilim Saati',
      'Konum Gecerli',
      'Mesafe (m)',
      'Kayit Turu',
    ];

    const body = payload.rows.map((row) => {
      const scannedAt = new Date(row.scannedAt);
      const hasValidDate = !Number.isNaN(scannedAt.getTime());

      const columns = [
        row.fullName,
        row.email ?? '-',
        row.phone ?? '-',
        hasValidDate ? this.dateFormatter.format(scannedAt) : '-',
        hasValidDate ? this.timeFormatter.format(scannedAt) : '-',
        row.distanceFromVenue !== null ? 'Evet' : 'Hayir',
        typeof row.distanceFromVenue === 'number'
          ? String(Math.round(row.distanceFromVenue))
          : '-',
        row.registrationType === 'walkIn' ? 'Walk-in' : 'Kayitli',
      ];

      return columns.map((value) => this.escapeCsvValue(value)).join(',');
    });

    const csvContent = `\uFEFF${[header.map((value) => this.escapeCsvValue(value)).join(','), ...body].join('\n')}`;

    await writeFile(filePath, csvContent, 'utf8');

    return {
      filePath,
      downloadUrl: `/exports/${payload.exportId}/download`,
    };
  }

  private escapeCsvValue(value: string) {
    const escaped = value.replace(/"/g, '""');

    return `"${escaped}"`;
  }

  private sanitizeFileName(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'attendance-export';
  }

  private resolveRegistrationType(
    participantId: string | null,
  ): RegistrationType {
    if (!participantId) {
      return 'walkIn';
    }

    const participant = this.participantsRepository.findById(participantId);

    if (!participant || participant.source === 'self_registered') {
      return 'walkIn';
    }

    return 'registered';
  }
}
