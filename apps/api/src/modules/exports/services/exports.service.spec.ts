import { BadRequestException, NotFoundException } from '@nestjs/common';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

import { AttendanceRecordsRepository } from '../../attendance/repositories/attendance-records.repository';
import { EventsRepository } from '../../events/repositories/events.repository';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository';
import { ExportsService } from './exports.service';

describe('ExportsService', () => {
  let service: ExportsService;
  let eventsRepository: EventsRepository;
  let attendanceRecordsRepository: AttendanceRecordsRepository;
  let participantsRepository: ParticipantsRepository;

  beforeEach(() => {
    eventsRepository = new EventsRepository();
    attendanceRecordsRepository = new AttendanceRecordsRepository();
    participantsRepository = new ParticipantsRepository();

    service = new ExportsService(
      eventsRepository,
      attendanceRecordsRepository,
      participantsRepository,
    );
  });

  afterEach(async () => {
    await rm(resolve(process.cwd(), 'tmp', 'exports'), {
      recursive: true,
      force: true,
    });
  });

  it('creates xlsx export, returns ready status and downloadable file', async () => {
    const event = seedEvent();
    const sessionId = crypto.randomUUID();

    const registeredParticipant = participantsRepository.create({
      eventId: event.id,
      name: 'Merve Kaya',
      email: 'merve@example.com',
      phone: '+905551112233',
      source: 'manual',
      externalId: null,
    });

    const walkInParticipant = participantsRepository.create({
      eventId: event.id,
      name: 'Sena Oz',
      email: 'sena@example.com',
      phone: null,
      source: 'self_registered',
      externalId: null,
    });

    attendanceRecordsRepository.create({
      eventId: event.id,
      sessionId,
      participantId: registeredParticipant.id,
      fullName: registeredParticipant.name,
      email: registeredParticipant.email,
      phone: registeredParticipant.phone,
      scannedAt: new Date().toISOString(),
      latitude: 40.765,
      longitude: 29.94,
      accuracy: 25,
      distanceFromVenue: 12,
      isValid: true,
      invalidReason: null,
      qrNonce: null,
      ipAddress: null,
      deviceFingerprint: null,
    });

    attendanceRecordsRepository.create({
      eventId: event.id,
      sessionId,
      participantId: walkInParticipant.id,
      fullName: walkInParticipant.name,
      email: walkInParticipant.email,
      phone: walkInParticipant.phone,
      scannedAt: new Date().toISOString(),
      latitude: 40.765,
      longitude: 29.94,
      accuracy: 25,
      distanceFromVenue: null,
      isValid: true,
      invalidReason: null,
      qrNonce: null,
      ipAddress: null,
      deviceFingerprint: null,
    });

    attendanceRecordsRepository.create({
      eventId: event.id,
      sessionId,
      participantId: null,
      fullName: 'Misafir Kisi',
      email: null,
      phone: '+905552223344',
      scannedAt: new Date().toISOString(),
      latitude: 40.765,
      longitude: 29.94,
      accuracy: 25,
      distanceFromVenue: 18,
      isValid: true,
      invalidReason: null,
      qrNonce: null,
      ipAddress: null,
      deviceFingerprint: null,
    });

    const requested = service.requestAttendanceExport(event.id);
    expect(requested.success).toBe(true);
    expect(requested.data.message).toBe('Hazirlaniyor...');

    const exportId = requested.data.exportId;
    const initialStatus = service.getStatus(exportId);

    expect(initialStatus.success).toBe(true);
    expect(['pending', 'processing']).toContain(initialStatus.data.status);

    const status = await waitForStatus(exportId, 'ready');

    expect(status.success).toBe(true);
    expect(status.data.status).toBe('ready');
    expect(status.data.downloadUrl).toBe(`/exports/${exportId}/download`);

    const filePath = service.getDownloadFilePath(exportId);

    expect(filePath.endsWith('.xlsx')).toBe(true);

    const buffer = await readFile(filePath);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows =
      XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet);

    const names = rows.map((row) => String(row['Ad Soyad'] ?? ''));
    expect(names).toEqual(
      expect.arrayContaining(['Merve Kaya', 'Sena Oz', 'Misafir Kisi']),
    );

    const byName = new Map(rows.map((row) => [String(row['Ad Soyad']), row]));
    expect(byName.get('Merve Kaya')?.['Kayit Turu']).toBe('Kayitli');
    expect(byName.get('Sena Oz')?.['Kayit Turu']).toBe('Walk-in');
    expect(byName.get('Misafir Kisi')?.['Kayit Turu']).toBe('Walk-in');
  });

  it('throws not found for missing event id', () => {
    expect(() => service.requestAttendanceExport('missing-event')).toThrow(
      NotFoundException,
    );
  });

  it('marks export as failed when file generation errors and blocks download', async () => {
    const event = seedEvent();

    const generateSpy = jest
      .spyOn(
        service as unknown as {
          generateAttendanceExportFile: (
            ...args: unknown[]
          ) => Promise<unknown>;
        },
        'generateAttendanceExportFile',
      )
      .mockRejectedValueOnce(new Error('generation failed'));

    const requested = service.requestAttendanceExport(event.id);
    const exportId = requested.data.exportId;
    const status = await waitForStatus(exportId, 'failed');

    expect(status.data.status).toBe('failed');
    expect(status.data.errorMessage).toBe('Export dosyasi olusturulamadi.');

    expect(() => service.getDownloadFilePath(exportId)).toThrow(
      BadRequestException,
    );

    generateSpy.mockRestore();
  });

  it('throws not found for unknown export status lookup', () => {
    expect(() => service.getStatus('unknown-export-id')).toThrow(
      NotFoundException,
    );
  });

  function seedEvent() {
    return eventsRepository.create({
      name: 'Yazilim Zirvesi',
      description: 'Etkinlik aciklamasi',
      locationName: 'Konferans Salonu',
      latitude: 40.765,
      longitude: 29.94,
      radiusMeters: 100,
      startsAt: '2026-04-20T08:00:00.000Z',
      endsAt: '2026-04-20T12:00:00.000Z',
      status: 'active',
    });
  }

  async function waitForStatus(
    exportId: string,
    expectedStatus: 'ready' | 'failed',
    timeoutMs = 2_000,
  ) {
    const startedAt = Date.now();

    while (Date.now() - startedAt <= timeoutMs) {
      const status = service.getStatus(exportId);

      if (status.data.status === expectedStatus) {
        return status;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
    }

    throw new Error(`Export status did not become ${expectedStatus} in time.`);
  }
});
