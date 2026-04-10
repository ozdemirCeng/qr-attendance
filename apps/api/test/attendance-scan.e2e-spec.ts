import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { EventsRepository } from '../src/modules/events/repositories/events.repository';
import { ParticipantsRepository } from '../src/modules/participants/repositories/participants.repository';
import { QrTokenService } from '../src/modules/qr/services/qr-token.service';
import { SessionsRepository } from '../src/modules/sessions/repositories/sessions.repository';
import { resetTestDatabase } from './support/reset-test-database';

describe('Attendance scan (e2e)', () => {
  let app: INestApplication<App>;
  let eventsRepository: EventsRepository;
  let sessionsRepository: SessionsRepository;
  let participantsRepository: ParticipantsRepository;
  let qrTokenService: QrTokenService;

  beforeEach(async () => {
    await resetTestDatabase();
    process.env.QR_SECRET =
      process.env.QR_SECRET || 'attendance-e2e-secret-12345';

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
    sessionsRepository = app.get(SessionsRepository);
    participantsRepository = app.get(ParticipantsRepository);
    qrTokenService = app.get(QrTokenService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts a valid scan and returns participant/event/session payload', async () => {
    const seeded = await seedActiveContext();
    const token = qrTokenService.generateToken(seeded.session.id, 60);

    const response = await request(app.getHttpServer())
      .post('/attendance/scan')
      .send({
        token,
        email: seeded.participant!.email,
        lat: seeded.event.latitude,
        lng: seeded.event.longitude,
        locationAccuracy: 20,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      action: 'CHECKED_IN',
      data: {
        participant: {
          id: seeded.participant!.id,
          name: seeded.participant!.name,
        },
      },
    });
  });

  it('allows guest completion after initial registration-required response', async () => {
    const seeded = await seedActiveContext(false);
    const token = qrTokenService.generateToken(seeded.session.id, 60);

    await request(app.getHttpServer())
      .post('/attendance/scan')
      .send({
        token,
        name: 'Walk In Kullanici',
        lat: seeded.event.latitude,
        lng: seeded.event.longitude,
        locationAccuracy: 20,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/attendance/scan')
      .send({
        token,
        name: 'Walk In Kullanici',
        email: 'walkin@example.com',
        lat: seeded.event.latitude,
        lng: seeded.event.longitude,
        locationAccuracy: 20,
      })
      .expect(201);
  });

  it('returns conflict when same participant scans same session again', async () => {
    const seeded = await seedActiveContext();

    await request(app.getHttpServer())
      .post('/attendance/scan')
      .send({
        token: qrTokenService.generateToken(seeded.session.id, 60),
        email: seeded.participant!.email,
        lat: seeded.event.latitude,
        lng: seeded.event.longitude,
        locationAccuracy: 20,
      })
      .expect(201);

    const duplicateResponse = await request(app.getHttpServer())
      .post('/attendance/scan')
      .send({
        token: qrTokenService.generateToken(seeded.session.id, 60),
        email: seeded.participant!.email,
        lat: seeded.event.latitude,
        lng: seeded.event.longitude,
        locationAccuracy: 20,
      })
      .expect(409);

    expect(duplicateResponse.body).toMatchObject({
      success: false,
      code: 'ALREADY_CHECKED_IN',
    });
  });

  async function seedActiveContext(withParticipant = true) {
    const now = Date.now();

    const event = await eventsRepository.create({
      name: 'E2E Etkinlik',
      description: 'Attendance scan e2e test',
      locationName: 'Konferans Salonu',
      latitude: 40.765,
      longitude: 29.94,
      radiusMeters: 120,
      startsAt: new Date(now - 15 * 60_000).toISOString(),
      endsAt: new Date(now + 45 * 60_000).toISOString(),
      status: 'active',
      createdBy: 'test-admin',
    });

    const session = await sessionsRepository.create({
      eventId: event.id,
      name: 'Ana Oturum',
      startsAt: new Date(now - 10 * 60_000).toISOString(),
      endsAt: new Date(now + 30 * 60_000).toISOString(),
    });

    const participant = withParticipant
      ? await participantsRepository.create({
          eventId: event.id,
          name: 'Merve Kaya',
          email: 'merve.e2e@example.com',
          phone: '+905551112233',
          source: 'manual',
          externalId: null,
        })
      : null;

    return {
      event,
      session,
      participant,
    };
  }
});
