import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

type ExportJobRow = {
  fullName: string;
  email: string | null;
  phone: string | null;
  scannedAt: string;
  distanceFromVenue: number | null;
  registrationType: 'walkIn' | 'registered';
};

type ExportJobPayload = {
  eventId: string;
  eventName: string;
  requestedAt: string;
  rows: ExportJobRow[];
};

type ExportJobResult = {
  filePath: string;
  fileName: string;
  rowCount: number;
  downloadUrl: string;
};

@Processor('export.queue')
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);
  private readonly dateFormatter = new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  private readonly timeFormatter = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  async process(job: Job<ExportJobPayload>): Promise<ExportJobResult> {
    this.logger.log(`Processing export job ${job.id}`);

    await job.updateProgress(10);

    const exportRows = job.data.rows.map((row) => {
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

    await job.updateProgress(40);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    this.styleHeaderRow(worksheet);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Katilim');

    await job.updateProgress(70);

    const outputDirectory = await this.ensureOutputDirectory(job.data.eventId);
    const fileName = `${this.sanitizeFileName(job.data.eventName)}-${Date.now()}.xlsx`;
    const filePath = join(outputDirectory, fileName);

    XLSX.writeFile(workbook, filePath, {
      bookType: 'xlsx',
    });

    await job.updateProgress(100);

    return {
      filePath,
      fileName,
      rowCount: exportRows.length,
      downloadUrl: `/exports/${String(job.id)}/download`,
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

  private async ensureOutputDirectory(eventId: string) {
    const outputDirectory = join(
      tmpdir(),
      'qr-attendance',
      'exports',
      eventId,
    );

    await mkdir(outputDirectory, { recursive: true });

    return outputDirectory;
  }

  private sanitizeFileName(value: string) {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || 'attendance-export';
  }
}
