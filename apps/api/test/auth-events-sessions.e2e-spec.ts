import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { EventsRepository } from '../src/modules/events/repositories/events.repository';

describe('Auth + Events/Sessions (e2e)', () => {
  let app: INestApplication<App>;
  let eventsRepository: EventsRepository;

  beforeEach(async () => {
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects event list access without authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/events')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      code: 'UNAUTHORIZED',
      statusCode: 401,
      path: '/events',
    });
  });

  it('allows demo admin login and protected event/session operations', async () => {
    const agent = request.agent(app.getHttpServer());

    const loginResponse = await agent.post('/auth/login').send({
      identifier: 'demoadmin',
      password: 'DemoAdmin123!',
    });

    expect(loginResponse.status).toBe(201);
    expect(loginResponse.body).toMatchObject({
      success: true,
    });

    const meResponse = await agent.get('/auth/me').expect(200);

    expect(meResponse.body).toMatchObject({
      email: 'demo.admin@qrattendance.local',
      role: 'admin',
    });

    const eventStart = new Date(Date.now() + 30 * 60_000);
    const eventEnd = new Date(Date.now() + 120 * 60_000);

    const createEventResponse = await agent
      .post('/events')
      .send({
        name: 'Auth E2E Etkinlik',
        description: 'Korumali endpoint testi',
        locationName: 'A Blok',
        latitude: 40.765,
        longitude: 29.94,
        radiusMeters: 100,
        startsAt: eventStart.toISOString(),
        endsAt: eventEnd.toISOString(),
        status: 'active',
      })
      .expect(201);

    expect(createEventResponse.body).toMatchObject({
      success: true,
      data: {
        name: 'Auth E2E Etkinlik',
      },
    });

    const sessionEvent = eventsRepository.create({
      name: 'Auth E2E Session Event',
      description: 'Session endpoint smoke test',
      locationName: 'B Blok',
      latitude: 40.766,
      longitude: 29.941,
      radiusMeters: 90,
      startsAt: eventStart.toISOString(),
      endsAt: eventEnd.toISOString(),
      status: 'active',
    });

    const sessionStart = new Date(Date.now() + 35 * 60_000);
    const sessionEnd = new Date(Date.now() + 65 * 60_000);

    const createSessionResponse = await agent
      .post(`/events/${sessionEvent.id}/sessions`)
      .send({
        name: 'Auth E2E Oturum',
        startsAt: sessionStart.toISOString(),
        endsAt: sessionEnd.toISOString(),
      })
      .expect(201);

    expect(createSessionResponse.body).toMatchObject({
      success: true,
      data: {
        eventId: sessionEvent.id,
        name: 'Auth E2E Oturum',
      },
    });

    await agent.get('/events?page=1&limit=10').expect(200);

    await agent.get(`/events/${sessionEvent.id}/sessions`).expect(200);

    await agent.post('/auth/logout').expect(201);
  });
});
