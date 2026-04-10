import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { AttendanceRecordsRepository } from '../src/modules/attendance/repositories/attendance-records.repository';
import { EventsRepository } from '../src/modules/events/repositories/events.repository';
import { ParticipantsRepository } from '../src/modules/participants/repositories/participants.repository';
import { SessionsRepository } from '../src/modules/sessions/repositories/sessions.repository';
import { resetTestDatabase } from './support/reset-test-database';

type ExportStatusResponse = {
  success: boolean;
  data: {
    exportId: string;
    status: 'pending' | 'processing' | 'ready' | 'failed';
    progress: number;
    downloadUrl: string | null;
    errorMessage: string | null;
  };
};

type HttpAgent = ReturnType<typeof request.agent>;

describe('Exports flow (e2e)', () => {
  let app: INestApplication<App>;
  let eventsRepository: EventsRepository;
  let participantsRepository: ParticipantsRepository;
  let attendanceRecordsRepository: AttendanceRecordsRepository;
  let sessionsRepository: SessionsRepository;

  beforeEach(async () => {
    await resetTestDatabase();
    process.env.QR_SECRET = 'attendance-e2e-secret-12345';
    process.env.DEMO_ADMIN_USERNAME = 'demoadmin';
    process.env.DEMO_ADMIN_EMAIL = 'demo.admin@qrattendance.local';
    process.env.DEMO_ADMIN_PASSWORD = 'DemoAdmin123!';
    process.env.DEMO_ADMIN_NAME = 'Demo Admin';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    eventsRepository = app.get(EventsRepository);
    participantsRepository = app.get(ParticipantsRepository);
    attendanceRecordsRepository = app.get(AttendanceRecordsRepository);
    sessionsRepository = app.get(SessionsRepository);
  });

  afterEach(async () => {
    await app.close();
    await rm(resolve(process.cwd(), 'tmp', 'exports'), {
      recursive: true,
      force: true,
    });
  });

  it('creates export, reaches ready state, and downloads xlsx file', async () => {
    const event = await seedEventAndAttendance();
    const agent = request.agent(app.getHttpServer());

    await agent.post('/auth/login').send({
      identifier: 'demoadmin',
      password: 'DemoAdmin123!',
    });

    const requestResponse = await agent
      .post(`/events/${event.id}/attendance/export`)
      .expect(201);

    const exportId = parseExportRequestId(requestResponse.text);
    const readyStatus = await waitUntilReady(agent, exportId);

    expect(readyStatus.data.status).toBe('ready');
    expect(readyStatus.data.downloadUrl).toBe(`/exports/${exportId}/download`);

    const downloadResponse = await agent
      .get(`/exports/${exportId}/download`)
      .expect(200);

    expect(downloadResponse.get('content-type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  async function seedEventAndAttendance() {
    const now = Date.now();
    const event = await eventsRepository.create({
      name: 'Export E2E Event',
      description: 'Export akisi test verisi',
      locationName: 'Konferans Salonu',
      latitude: 40.765,
      longitude: 29.94,
      radiusMeters: 100,
      startsAt: new Date(now - 30 * 60_000).toISOString(),
      endsAt: new Date(now + 60 * 60_000).toISOString(),
      status: 'active',
      createdBy: 'test-admin',
    });

    const participant = await participantsRepository.create({
      eventId: event.id,
      name: 'Merve Kaya',
      email: 'merve.export@example.com',
      phone: '+905551112233',
      source: 'manual',
      externalId: null,
    });

    const session = await sessionsRepository.create({
      eventId: event.id,
      name: 'Export E2E Session',
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
      scannedAt: new Date(now - 5 * 60_000).toISOString(),
      latitude: event.latitude,
      longitude: event.longitude,
      accuracy: 10,
      distanceFromVenue: 8,
      isValid: true,
      invalidReason: null,
      qrNonce: null,
      verificationPhotoDataUrl: null,
      verificationPhotoCapturedAt: null,
      ipAddress: '127.0.0.1',
      deviceFingerprint: 'e2e-device',
    });

    return event;
  }
});

function parseExportRequestId(responseText: string) {
  const parsed = JSON.parse(responseText) as {
    data?: { exportId?: string };
  };
  const exportId = parsed.data?.exportId;

  if (typeof exportId !== 'string' || exportId.length === 0) {
    throw new Error('Export id bulunamadi.');
  }

  return exportId;
}

async function waitUntilReady(
  agent: HttpAgent,
  exportId: string,
  timeoutMs = 3_000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const statusResponse = await agent
      .get(`/exports/${exportId}/status`)
      .expect(200);
    const parsed = JSON.parse(statusResponse.text) as ExportStatusResponse;

    if (parsed.data.status === 'ready') {
      return parsed;
    }

    if (parsed.data.status === 'failed') {
      throw new Error(parsed.data.errorMessage ?? 'Export basarisiz oldu.');
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  }

  throw new Error('Export zamaninda ready durumuna gecmedi.');
}
