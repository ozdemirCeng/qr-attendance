import { BadRequestException, NotFoundException } from '@nestjs/common';

import { EventsRepository } from '../../events/repositories/events.repository';
import { ParticipantsRepository } from '../repositories/participants.repository';
import { UploadedCsvFile } from '../participants.types';
import { ParticipantsService } from './participants.service';

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let eventsRepository: EventsRepository;

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
      status: 'draft',
    });
  }

  function asUploadedCsv(content: string): UploadedCsvFile {
    return {
      originalname: 'participants.csv',
      mimetype: 'text/csv',
      size: Buffer.byteLength(content),
      buffer: Buffer.from(content, 'utf-8'),
    };
  }

  beforeEach(() => {
    eventsRepository = new EventsRepository();
    service = new ParticipantsService(
      new ParticipantsRepository(),
      eventsRepository,
    );
  });

  it('creates and lists manual participants', () => {
    const event = seedEvent();

    const created = service.createManual(event.id, {
      name: 'Ahmet Yilmaz',
      email: 'AHMET@EXAMPLE.COM',
      phone: '+905551112233',
    });

    const listed = service.list(event.id, {
      page: 1,
      limit: 20,
      search: 'ahmet',
    });

    expect(created.success).toBe(true);
    expect(created.data.source).toBe('manual');
    expect(created.data.email).toBe('ahmet@example.com');
    expect(listed.success).toBe(true);
    expect(listed.data).toHaveLength(1);
    expect(listed.pagination.total).toBe(1);
  });

  it('imports csv with row-level validation and email upsert behavior', () => {
    const event = seedEvent();
    const csv = [
      'name,email,phone,external_id',
      'Ali,ali@example.com,111,ext-1',
      ',noname@example.com,222,ext-2',
      'Veli,not-an-email,333,ext-3',
      'Ayse,ali@example.com,999,ext-9',
    ].join('\n');

    const result = service.importCsv(event.id, asUploadedCsv(csv));

    expect(result.success).toBe(true);
    expect(result.data.total).toBe(4);
    expect(result.data.success).toBe(2);
    expect(result.data.failed).toBe(2);

    const listed = service.list(event.id, {
      page: 1,
      limit: 20,
      search: 'ali@example.com',
    });
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].name).toBe('Ayse');
    expect(listed.data[0].phone).toBe('999');
    expect(listed.data[0].source).toBe('csv');
    expect(listed.data[0].externalId).toBe('ext-9');
  });

  it('removes participant by id', () => {
    const event = seedEvent();

    const created = service.createManual(event.id, {
      name: 'Silinecek Kisi',
      email: 'remove@example.com',
      phone: '555',
    });

    const removed = service.remove(event.id, created.data.id);

    expect(removed.success).toBe(true);

    const listed = service.list(event.id, {
      page: 1,
      limit: 20,
      search: undefined,
    });
    expect(listed.data).toHaveLength(0);
  });

  it('throws bad request for empty csv file', () => {
    const event = seedEvent();

    expect(() => service.importCsv(event.id, asUploadedCsv(''))).toThrow(
      BadRequestException,
    );
  });

  it('throws not found when event does not exist', () => {
    expect(() =>
      service.createManual('missing-event', {
        name: 'Ahmet',
        email: 'ahmet@example.com',
        phone: '555',
      }),
    ).toThrow(NotFoundException);
  });
});
