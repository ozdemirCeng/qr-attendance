import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Job } from 'bullmq';
import * as XLSX from 'xlsx';

import { ExportProcessor } from './export.processor';

describe('ExportProcessor', () => {
  let processor: ExportProcessor;
  let previousCwd: string;
  let tempDir: string;

  beforeEach(async () => {
    processor = new ExportProcessor();
    previousCwd = process.cwd();
    tempDir = await mkdtemp(join(tmpdir(), 'qr-worker-export-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    await rm(tempDir, { recursive: true, force: true });
  });

  it('writes an xlsx file and reports progress updates', async () => {
    const updateProgress = jest.fn().mockResolvedValue(undefined);
    const job = {
      id: 'export-job-1',
      data: {
        eventId: 'event-1',
        eventName: 'Yazilim Zirvesi 2026',
        requestedAt: '2026-04-10T10:00:00.000Z',
        rows: [
          {
            fullName: 'Merve Kaya',
            email: 'merve@example.com',
            phone: '+905551112233',
            scannedAt: '2026-04-10T10:15:00.000Z',
            distanceFromVenue: 12.4,
            registrationType: 'registered' as const,
          },
        ],
      },
      updateProgress,
    } as unknown as Job<{
      eventId: string;
      eventName: string;
      requestedAt: string;
      rows: Array<{
        fullName: string;
        email: string | null;
        phone: string | null;
        scannedAt: string;
        distanceFromVenue: number | null;
        registrationType: 'walkIn' | 'registered';
      }>;
    }>;

    const result = await processor.process(job);

    const buffer = await readFile(result.filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows =
      XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet);

    expect(updateProgress).toHaveBeenNthCalledWith(1, 10);
    expect(updateProgress).toHaveBeenNthCalledWith(2, 40);
    expect(updateProgress).toHaveBeenNthCalledWith(3, 70);
    expect(updateProgress).toHaveBeenNthCalledWith(4, 100);
    expect(result.downloadUrl).toBe('/exports/export-job-1/download');
    expect(result.filePath.endsWith('.xlsx')).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.['Ad Soyad']).toBe('Merve Kaya');
    expect(rows[0]?.['Kayit Turu']).toBe('Kayitli');
  });
});
