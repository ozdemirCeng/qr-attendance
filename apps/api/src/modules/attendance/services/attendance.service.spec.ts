import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  beforeEach(() => {
    const nonceMemory = new Set<string>();

    const nonceStore = {
      isUsed: (sessionId: string, nonce: string) =>
        Promise.resolve(nonceMemory.has(`${sessionId}:${nonce}`)),
      markUsed: (sessionId: string, nonce: string) => {
        nonceMemory.add(`${sessionId}:${nonce}`);
        return Promise.resolve();
      },
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

  it('processes happy path and creates checked-in record', async () => {
    const { event, session } = seedActiveEventAndSession(
      eventsRepository,
      sessionsRepository,
    );

    const participant = participantsRepository.create({
      eventId: event.id,
      name: 'Merve Kaya',
      email: 'merve@example.com',
      phone: '+905551111111',
      source: 'manual',
      externalId: null,
    });

    const token = qrTokenService.generateToken(session.id, 60);

    const result = await service.scan(
      {
        token,
        email: 'merve@example.com',
        lat: 40.7652,
        lng: 29.9401,
        locationAccuracy: 25,
      },
      {
        ip: '127.0.0.1',
        userAgent: 'jest',
      },
    );

    expect(result.success).toBe(true);
    expect(result.action).toBe('CHECKED_IN');
    expect(result.data.participant.id).toBe(participant.id);
    expect(
      attendanceRecordsRepository.findBySessionId(session.id),
    ).toHaveLength(1);
    expect(
      attendanceAttemptsRepository.findBySessionId(session.id),
    ).toHaveLength(1);
  });

  it('returns MALFORMED_TOKEN for invalid token format', async () => {
    await expectCode(
      service.scan({ token: 'invalid-token' }, {}),
      'MALFORMED_TOKEN',
    );

    const attempts =
      attendanceAttemptsRepository.findBySessionId('unknown-session');
    expect(attempts).toHaveLength(1);
    expect(attempts[0].reason).toBe('MALFORMED_TOKEN');
  });

  it('returns EXPIRED_TOKEN for expired token', async () => {
    const { session } = seedActiveEventAndSession(
      eventsRepository,
      sessionsRepository,
    );
    const expiredToken = qrTokenService.generateToken(
      session.id,
      60,
      Date.now() - 180_000,
    );

    await expectCode(
      service.scan({ token: expiredToken, lat: 40.765, lng: 29.94 }, {}),
      'EXPIRED_TOKEN',
    );
  });

  it('returns INVALID_SIGNATURE for tampered signature', async () => {
    const { session } = seedActiveEventAndSession(
      eventsRepository,
      sessionsRepository,
    );
    const token = qrTokenService.generateToken(session.id, 60);

    await expectCode(
      service.scan(
        { token: tamperSignature(token), lat: 40.765, lng: 29.94 },
        {},
      ),
      'INVALID_SIGNATURE',
    );
  });

  it('returns REPLAY_ATTACK for reused token', async () => {
    const { event, session } = seedActiveEventAndSession(
      eventsRepository,
      sessionsRepository,
    );

    participantsRepository.create({
      eventId: event.id,
      name: 'Ali Veli',
      email: 'ali@example.com',
      phone: null,
      source: 'manual',
      externalId: null,
    });

    const token = qrTokenService.generateToken(session.id, 60);

    await service.scan(
      {
        token,
        email: 'ali@example.com',
        lat: 40.765,
        lng: 29.94,
      },
      {},
    );

    await expectCode(
      service.scan(
        {
          token,
          email: 'ali@example.com',
          lat: 40.765,
          lng: 29.94,
        },
        {},
      ),
      'REPLAY_ATTACK',
    );
  });

  it('returns SESSION_NOT_FOUND when token session does not exist', async () => {
    const token = qrTokenService.generateToken(crypto.randomUUID(), 60);

    await expectCode(
      service.scan({ token, lat: 40.765, lng: 29.94 }, {}),
      'SESSION_NOT_FOUND',
    );
  });

  it('returns SESSION_INACTIVE when session is outside active range', async () => {
    const event = eventsRepository.create({
      name: 'Gecmis Etkinlik',
      description: null,
      locationName: 'A Blok',
      latitude: 40.765,
      longitude: 29.94,
      radiusMeters: 100,
      startsAt: new Date(Date.now() - 7_200_000).toISOString(),
      endsAt: new Date(Date.now() - 3_600_000).toISOString(),
      status: 'active',
    });

    const session = sessionsRepository.create({
      eventId: event.id,
      name: 'Eski Oturum',
      startsAt: new Date(Date.now() - 7_000_000).toISOString(),
      endsAt: new Date(Date.now() - 3_500_000).toISOString(),
    });

    const token = qrTokenService.generateToken(session.id, 60);

    await expectCode(
      service.scan({ token, lat: 40.765, lng: 29.94 }, {}),
      'SESSION_INACTIVE',
    );
  });

  it('returns NO_LOCATION_DATA when location payload is missing', async () => {
    const { session } = seedActiveEventAndSession(
      eventsRepository,
      sessionsRepository,
    );
    const token = qrTokenService.generateToken(session.id, 60);

    await expectCode(service.scan({ token }, {}), 'NO_LOCATION_DATA');
  });

  it('returns LOCATION_OUT_OF_RANGE when geofence check fails', async () => {
    const { session } = seedActiveEventAndSession(
      eventsRepository,
      sessionsRepository,
    );
    const token = qrTokenService.generateToken(session.id, 60);

    await expectCode(
      service.scan(
        {
          token,
          lat: 41.5,
          lng: 29.94,
          locationAccuracy: 5,
        },
        {},
      ),
      'LOCATION_OUT_OF_RANGE',
    );
  });

  it('returns REGISTRATION_REQUIRED when participant is unknown and name is missing', async () => {
    const { session } = seedActiveEventAndSession(
      eventsRepository,
      sessionsRepository,
    );
    const token = qrTokenService.generateToken(session.id, 60);

    await expectCode(
      service.scan(
        {
          token,
          email: 'unknown@example.com',
          lat: 40.765,
          lng: 29.94,
        },
        {},
      ),
      'REGISTRATION_REQUIRED',
    );
  });

  it('returns ALREADY_CHECKED_IN for second scan of same participant', async () => {
    const { event, session } = seedActiveEventAndSession(
      eventsRepository,
      sessionsRepository,
    );

    participantsRepository.create({
      eventId: event.id,
      name: 'Deniz',
      email: 'deniz@example.com',
      phone: null,
      source: 'manual',
      externalId: null,
    });

    const firstToken = qrTokenService.generateToken(session.id, 60);
    const secondToken = qrTokenService.generateToken(session.id, 60);

    await service.scan(
      {
        token: firstToken,
        email: 'deniz@example.com',
        lat: 40.765,
        lng: 29.94,
      },
      {},
    );

    await expectCode(
      service.scan(
        {
          token: secondToken,
          email: 'deniz@example.com',
          lat: 40.765,
          lng: 29.94,
        },
        {},
      ),
      'ALREADY_CHECKED_IN',
    );
  });
});

function seedActiveEventAndSession(
  eventsRepository: EventsRepository,
  sessionsRepository: SessionsRepository,
) {
  const event = eventsRepository.create({
    name: 'Aktif Etkinlik',
    description: null,
    locationName: 'A Blok',
    latitude: 40.765,
    longitude: 29.94,
    radiusMeters: 100,
    startsAt: new Date(Date.now() - 3_600_000).toISOString(),
    endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    status: 'active',
  });

  const session = sessionsRepository.create({
    eventId: event.id,
    name: 'Aktif Oturum',
    startsAt: new Date(Date.now() - 1_800_000).toISOString(),
    endsAt: new Date(Date.now() + 1_800_000).toISOString(),
  });

  return { event, session };
}

function tamperSignature(token: string) {
  const decoded = Buffer.from(token, 'base64url').toString('utf-8');
  const payload = JSON.parse(decoded) as {
    v: number;
    sid: string;
    tw: number;
    nonce: string;
    sig: string;
  };

  payload.sig = 'invalid-signature';

  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}

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
