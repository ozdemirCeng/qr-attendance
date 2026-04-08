import { BadRequestException, NotFoundException } from '@nestjs/common';

import { EventsRepository } from '../../events/repositories/events.repository';
import { SessionsRepository } from '../repositories/sessions.repository';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  let service: SessionsService;
  let eventsRepository: EventsRepository;

  function seedEvent() {
    return eventsRepository.create({
      name: 'Yazilim Semineri',
      description: 'Etkinlik aciklamasi',
      locationName: 'B Blok 301',
      latitude: 40.765,
      longitude: 29.94,
      radiusMeters: 100,
      startsAt: '2026-04-20T08:00:00.000Z',
      endsAt: '2026-04-20T12:00:00.000Z',
      status: 'draft',
    });
  }

  beforeEach(() => {
    eventsRepository = new EventsRepository();
    service = new SessionsService(new SessionsRepository(), eventsRepository);
  });

  it('creates session for existing event', () => {
    const event = seedEvent();

    const result = service.create(event.id, {
      name: '1. Oturum',
      startsAt: '2026-04-20T08:30:00.000Z',
      endsAt: '2026-04-20T09:30:00.000Z',
    });

    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
    expect(result.data.eventId).toBe(event.id);
  });

  it('lists sessions by event id', () => {
    const event = seedEvent();

    service.create(event.id, {
      name: 'A',
      startsAt: '2026-04-20T08:30:00.000Z',
      endsAt: '2026-04-20T09:30:00.000Z',
    });

    const result = service.list(event.id);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('A');
  });

  it('updates session values', () => {
    const event = seedEvent();
    const created = service.create(event.id, {
      name: 'A',
      startsAt: '2026-04-20T08:30:00.000Z',
      endsAt: '2026-04-20T09:30:00.000Z',
    });

    const updated = service.update(event.id, created.data.id, {
      name: 'B',
      endsAt: '2026-04-20T10:00:00.000Z',
    });

    expect(updated.success).toBe(true);
    expect(updated.data.name).toBe('B');
    expect(updated.data.endsAt).toBe('2026-04-20T10:00:00.000Z');
  });

  it('removes session', () => {
    const event = seedEvent();
    const created = service.create(event.id, {
      name: 'A',
      startsAt: '2026-04-20T08:30:00.000Z',
      endsAt: '2026-04-20T09:30:00.000Z',
    });

    const removed = service.remove(event.id, created.data.id);
    expect(removed.success).toBe(true);

    expect(() =>
      service.update(event.id, created.data.id, { name: 'C' }),
    ).toThrow(NotFoundException);
  });

  it('throws not found when event does not exist', () => {
    expect(() =>
      service.create('missing-event', {
        name: 'A',
        startsAt: '2026-04-20T08:30:00.000Z',
        endsAt: '2026-04-20T09:30:00.000Z',
      }),
    ).toThrow(NotFoundException);
  });

  it('throws bad request for invalid date range', () => {
    const event = seedEvent();

    expect(() =>
      service.create(event.id, {
        name: 'A',
        startsAt: '2026-04-20T11:00:00.000Z',
        endsAt: '2026-04-20T10:00:00.000Z',
      }),
    ).toThrow(BadRequestException);
  });
});
