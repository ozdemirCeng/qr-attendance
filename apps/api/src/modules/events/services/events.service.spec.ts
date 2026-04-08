import { NotFoundException } from '@nestjs/common';

import { CreateEventDto } from '../dto/create-event.dto';
import { EventsRepository } from '../repositories/events.repository';
import { EventsService } from './events.service';

describe('EventsService', () => {
  let service: EventsService;

  const basePayload: CreateEventDto = {
    name: 'Staj Bilgilendirme Oturumu',
    description: 'Adaylara surec aktarimi',
    locationName: 'Konferans Salonu',
    latitude: 40.765,
    longitude: 29.94,
    radiusMeters: 100,
    startsAt: '2026-04-15T09:00:00.000Z',
    endsAt: '2026-04-15T11:00:00.000Z',
    status: 'draft',
  };

  beforeEach(() => {
    service = new EventsService(new EventsRepository());
  });

  it('creates an event', () => {
    const result = service.create(basePayload);

    expect(result.success).toBe(true);
    expect(result.data.id).toBeDefined();
    expect(result.data.name).toBe(basePayload.name);
    expect(result.data.status).toBe('draft');
  });

  it('lists events with pagination metadata', () => {
    service.create(basePayload);

    const result = service.list({ page: 1, limit: 20 });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.page).toBe(1);
  });

  it('updates an event', () => {
    const created = service.create(basePayload);

    const updated = service.update(created.data.id, {
      name: 'Guncel Etkinlik Adi',
      endsAt: '2026-04-15T12:00:00.000Z',
    });

    expect(updated.success).toBe(true);
    expect(updated.data.name).toBe('Guncel Etkinlik Adi');
    expect(updated.data.endsAt).toBe('2026-04-15T12:00:00.000Z');
  });

  it('soft deletes an event', () => {
    const created = service.create(basePayload);

    const removed = service.remove(created.data.id);
    expect(removed.success).toBe(true);

    expect(() => service.detail(created.data.id)).toThrow(NotFoundException);
  });

  it('throws not found for missing event detail', () => {
    expect(() => service.detail('unknown-id')).toThrow(NotFoundException);
  });
});
