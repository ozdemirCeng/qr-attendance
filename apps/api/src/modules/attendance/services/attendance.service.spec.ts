import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { resetTestDatabase } from '../../../../test/support/reset-test-database';
import { EventsRepository } from '../../events/repositories/events.repository';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository';
import { QrNonceStoreService } from '../../qr/services/qr-nonce-store.service';
import { QrTokenService } from '../../qr/services/qr-token.service';
import { SessionsRepository } from '../../sessions/repositories/sessions.repository';
import { AttendanceAttemptsRepository } from '../repositories/attendance-attempts.repository';
import { AttendanceRecordsRepository } from '../repositories/attendance-records.repository';
import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let eventsRepository: EventsRepository;
  let sessionsRepository: SessionsRepository;
  let participantsRepository: ParticipantsRepository;
  let attendanceRecordsRepository: AttendanceRecordsRepository;
  let attendanceAttemptsRepository: AttendanceAttemptsRepository;
  let qrTokenService: QrTokenService;

  beforeEach(async () => {
    await resetTestDatabase();

    const nonceMemory = new Set<string>();
    const nonceStore = {
      isUsed: (sessionId: string, nonce: string) =>
        Promise.resolve(nonceMemory.has(`${sessionId}:${nonce}`)),
      markUsed: (sessionId: string, nonce: string) => {
        nonceMemory.add(`${sessionId}:${nonce}`);
        return Promise.resolve();
      },
      getTokenForCode: () => Promise.resolve(null),
      setTokenForCode: () => Promise.resolve(),
    } as unknown as QrNonceStoreService;

    const configService = {
      get: (key: string, defaultValue?: unknown) => {
        if (key === 'QR_SECRET') {
          return 'attendance-test-secret-12345';
        }

        if (key === 'QR_ROTATION_SECONDS') {
          return 60;
        }

        return defaultValue;
      },
    } as unknown as ConfigService;

    eventsRepository = new EventsRepository();
    sessionsRepository = new SessionsRepository();
    participantsRepository = new ParticipantsRepository();
    attendanceRecordsRepository = new AttendanceRecordsRepository();
    attendanceAttemptsRepository = new AttendanceAttemptsRepository();
    qrTokenService = new QrTokenService(configService, nonceStore);

    service = new AttendanceService(
      configService,
      qrTokenService,
      sessionsRepository,
      eventsRepository,
      participantsRepository,
      attendanceRecordsRepository,
      attendanceAttemptsRepository,
    );
  });

  it('processes happy path and stores attendance record', async () => {
    const { event, session } = await seedActiveEventAndSession();
    const participant = await participantsRepository.create({
      eventId: event.id,
      name: 'Merve Kaya',
      email: 'merve@example.com',
      phone: '+905551111111',
      source: 'manual',
      externalId: null,
    });

    const result = await service.scan({
      token: qrTokenService.generateToken(session.id, 60),
      email: participant.email ?? undefined,
      lat: event.latitude,
      lng: event.longitude,
      locationAccuracy: 15,
      verificationPhotoDataUrl: createVerificationPhoto(),
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('CHECKED_IN');
    expect(result.data.participant.id).toBe(participant.id);

    const records = await attendanceRecordsRepository.findBySessionId(
      session.id,
    );
    const attempts = await attendanceAttemptsRepository.findBySessionId(
      session.id,
    );

    expect(records).toHaveLength(1);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.result).toBe('success');
  });

  it('allows guest completion after REGISTRATION_REQUIRED using the same token', async () => {
    const { event, session } = await seedActiveEventAndSession();
    const token = qrTokenService.generateToken(session.id, 60);

    await expectCode(
      service.scan(
        {
          token,
          name: 'Konuk Kullanici',
          lat: event.latitude,
          lng: event.longitude,
          locationAccuracy: 20,
        },
        {},
      ),
      'REGISTRATION_REQUIRED',
    );

    const completed = await service.scan(
      {
        token,
        name: 'Konuk Kullanici',
        email: 'guest@example.com',
        lat: event.latitude,
        lng: event.longitude,
        locationAccuracy: 20,
        verificationPhotoDataUrl: createVerificationPhoto(),
      },
      {},
    );

    expect(completed.success).toBe(true);
    expect(completed.action).toBe('CHECKED_IN');
    expect(completed.data.participant.name).toBe('Konuk Kullanici');
  });

  it('rejects malformed token', async () => {
    await expectCode(
      service.scan({ token: 'invalid-token' }, {}),
      'MALFORMED_TOKEN',
    );
  });

  it('rejects duplicate check-in for the same participant and session', async () => {
    const { event, session } = await seedActiveEventAndSession();
    await participantsRepository.create({
      eventId: event.id,
      name: 'Ali Veli',
      email: 'ali@example.com',
      phone: null,
      source: 'manual',
      externalId: null,
    });

    await service.scan({
      token: qrTokenService.generateToken(session.id, 60),
      email: 'ali@example.com',
      lat: event.latitude,
      lng: event.longitude,
      locationAccuracy: 20,
      verificationPhotoDataUrl: createVerificationPhoto(),
    });

    await expectCode(
      service.scan({
        token: qrTokenService.generateToken(session.id, 60),
        email: 'ali@example.com',
        lat: event.latitude,
        lng: event.longitude,
        locationAccuracy: 20,
        verificationPhotoDataUrl: createVerificationPhoto(),
      }),
      'ALREADY_CHECKED_IN',
    );
  });

  it('lists attendance and computes stats', async () => {
    const { event, session } = await seedActiveEventAndSession();
    const participant = await participantsRepository.create({
      eventId: event.id,
      name: 'Liste Kullanici',
      email: 'liste@example.com',
      phone: null,
      source: 'csv',
      externalId: 'csv-1',
    });

    const checkedIn = await service.scan({
      token: qrTokenService.generateToken(session.id, 60),
      email: participant.email ?? undefined,
      lat: event.latitude,
      lng: event.longitude,
      locationAccuracy: 20,
      verificationPhotoDataUrl: createVerificationPhoto(),
    });

    const listed = await service.listByEvent(event.id, {
      page: 1,
      limit: 20,
    });
    const stats = await service.statsByEvent(event.id);

    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]?.id).toBe(checkedIn.data.attendanceId);
    expect(listed.data[0]?.registrationType).toBe('registered');
    expect(stats.data).toEqual({
      total: 1,
      valid: 1,
      invalid: 0,
      walkIn: 0,
      registered: 1,
    });
  });

  it('updates manual status', async () => {
    const { event, session } = await seedActiveEventAndSession();
    const participant = await participantsRepository.create({
      eventId: event.id,
      name: 'Manuel Durum',
      email: 'durum@example.com',
      phone: null,
      source: 'manual',
      externalId: null,
    });

    const checkedIn = await service.scan({
      token: qrTokenService.generateToken(session.id, 60),
      email: participant.email ?? undefined,
      lat: event.latitude,
      lng: event.longitude,
      locationAccuracy: 20,
      verificationPhotoDataUrl: createVerificationPhoto(),
    });

    const updated = await service.updateManualStatus(
      checkedIn.data.attendanceId,
      {
        isValid: false,
        reason: 'Manuel kontrol',
      },
    );

    expect(updated.data.isValid).toBe(false);
    expect(updated.data.invalidReason).toBe('Manuel kontrol');
  });

  it('creates or updates attendance with manual upsert', async () => {
    const { event, session } = await seedActiveEventAndSession();
    const participant = await participantsRepository.create({
      eventId: event.id,
      name: 'Admin Isaretleme',
      email: 'admin@example.com',
      phone: null,
      source: 'manual',
      externalId: null,
    });

    const created = await service.manualUpsertForParticipant(event.id, {
      participantId: participant.id,
      sessionId: session.id,
      isValid: true,
    });

    const updated = await service.manualUpsertForParticipant(event.id, {
      participantId: participant.id,
      sessionId: session.id,
      isValid: false,
      reason: 'Yok yazildi',
    });

    expect(created.data.participantId).toBe(participant.id);
    expect(updated.data.id).toBe(created.data.id);
    expect(updated.data.isValid).toBe(false);
    expect(updated.data.invalidReason).toBe('Yok yazildi');
  });

  async function seedActiveEventAndSession() {
    const event = await eventsRepository.create({
      name: 'Aktif Etkinlik',
      description: null,
      locationName: 'A Blok',
      latitude: 40.765,
      longitude: 29.94,
      radiusMeters: 100,
      startsAt: new Date(Date.now() - 3_600_000).toISOString(),
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
      status: 'active',
      createdBy: 'test-admin',
    });

    const session = await sessionsRepository.create({
      eventId: event.id,
      name: 'Aktif Oturum',
      startsAt: new Date(Date.now() - 1_800_000).toISOString(),
      endsAt: new Date(Date.now() + 1_800_000).toISOString(),
    });

    return { event, session };
  }
});

async function expectCode(promise: Promise<unknown>, expectedCode: string) {
  try {
    await promise;
    throw new Error('Expected promise to reject');
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    const payload = (error as HttpException).getResponse() as Record<
      string,
      unknown
    >;
    expect(payload.code).toBe(expectedCode);
  }
}

function createVerificationPhoto() {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn1Ao8AAAAASUVORK5CYII=';
}
