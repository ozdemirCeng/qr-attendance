import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

import { resetTestDatabase } from '../../../../test/support/reset-test-database';
import { AttendanceRecordsRepository } from '../../attendance/repositories/attendance-records.repository';
import { EventsRepository } from '../../events/repositories/events.repository';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository';
import { SessionsRepository } from '../../sessions/repositories/sessions.repository';
import { ExportJobsRepository } from '../repositories/export-jobs.repository';
import { ExportsService } from './exports.service';

describe('ExportsService', () => {
  let service: ExportsService;
  let eventsRepository: EventsRepository;
  let attendanceRecordsRepository: AttendanceRecordsRepository;
  let participantsRepository: ParticipantsRepository;
  let sessionsRepository: SessionsRepository;

  beforeEach(async () => {
    await resetTestDatabase();

    eventsRepository = new EventsRepository();
    attendanceRecordsRepository = new AttendanceRecordsRepository();
    participantsRepository = new ParticipantsRepository();
    sessionsRepository = new SessionsRepository();

    service = new ExportsService(
      eventsRepository,
      attendanceRecordsRepository,
      participantsRepository,
      new ExportJobsRepository(),
      new ConfigService({
        REDIS_URL: undefined,
      }),
    );
  });

  afterEach(async () => {
    await rm(resolve(process.cwd(), 'tmp', 'exports'), {
      recursive: true,
      force: true,
    });
  });

  it('creates export job, reaches ready state, and writes xlsx', async () => {
    const event = await seedEvent();
    const participant = await participantsRepository.create({
      eventId: event.id,
      name: 'Merve Kaya',
      email: 'merve@example.com',
      phone: '+905551112233',
      source: 'manual',
      externalId: null,
    });

    const session = await sessionsRepository.create({
      eventId: event.id,
      name: 'Export Oturumu',
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    });

    await attendanceRecordsRepository.create({
      eventId: event.id,
      sessionId: session.id,
      participantId: participant.id,
      fullName: participant.name,
      email: participant.email,
      phone: participant.phone,
      scannedAt: new Date().toISOString(),
      latitude: event.latitude,
      longitude: event.longitude,
      accuracy: 15,
      distanceFromVenue: 8,
      isValid: true,
      invalidReason: null,
      qrNonce: null,
      verificationPhotoDataUrl: null,
      verificationPhotoCapturedAt: null,
      ipAddress: '127.0.0.1',
      deviceFingerprint: 'jest-device',
    });

    const requested = await service.requestAttendanceExport(event.id);
    const exportId = requested.data.exportId;
    const readyStatus = await waitForStatus(exportId, 'ready');
    const filePath = await service.getDownloadFilePath(exportId);
    const buffer = await readFile(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows =
      XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet);

    expect(readyStatus.data.status).toBe('ready');
    expect(readyStatus.data.downloadUrl).toBe(`/exports/${exportId}/download`);
    expect(filePath.endsWith('.xlsx')).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.['Ad Soyad']).toBe('Merve Kaya');
    expect(rows[0]?.['Kayit Turu']).toBe('Kayitli');
  });

  it('throws not found for missing event id', async () => {
    await expect(
      service.requestAttendanceExport('missing-event'),
    ).rejects.toThrow(NotFoundException);
  });

  it('marks export as failed when generation fails', async () => {
    const event = await seedEvent();
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

    const requested = await service.requestAttendanceExport(event.id);
    const exportId = requested.data.exportId;
    const status = await waitForStatus(exportId, 'failed');

    expect(status.data.status).toBe('failed');
    expect(status.data.errorMessage).toBe('Export dosyasi olusturulamadi.');
    await expect(service.getDownloadFilePath(exportId)).rejects.toThrow(
      BadRequestException,
    );

    generateSpy.mockRestore();
  });

  it('throws not found for unknown export status lookup', async () => {
    await expect(service.getStatus('unknown-export-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  async function seedEvent() {
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
      createdBy: 'test-admin',
    });
  }

  async function waitForStatus(
    exportId: string,
    expectedStatus: 'ready' | 'failed',
    timeoutMs = 2_000,
  ) {
    const startedAt = Date.now();

    while (Date.now() - startedAt <= timeoutMs) {
      const status = await service.getStatus(exportId);

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
