import { BadRequestException, NotFoundException } from '@nestjs/common';

import { resetTestDatabase } from '../../../../test/support/reset-test-database';
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

  beforeEach(async () => {
    await resetTestDatabase();
    eventsRepository = new EventsRepository();
    service = new ParticipantsService(
      new ParticipantsRepository(),
      eventsRepository,
    );
  });

  it('creates and lists manual participants', async () => {
    const event = await seedEvent();

    const created = await service.createManual(event.id, {
      name: 'Ahmet Yilmaz',
      email: 'AHMET@EXAMPLE.COM',
      phone: '+905551112233',
    });

    const listed = await service.list(event.id, {
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

  it('rejects duplicate manual participants by email or phone', async () => {
    const event = await seedEvent();

    await service.createManual(event.id, {
      name: 'Ilk Kisi',
      email: 'ahmet@example.com',
      phone: '+905551112233',
    });

    await expect(
      service.createManual(event.id, {
        name: 'Ayni Email',
        email: 'AHMET@example.com',
        phone: '+905551119999',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createManual(event.id, {
        name: 'Ayni Telefon',
        email: 'farkli@example.com',
        phone: '0555 111 22 33',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('imports csv with row-level validation and email upsert behavior', async () => {
    const event = await seedEvent();
    const csv = [
      'name,email,phone,external_id',
      'Ali,ali@example.com,111,ext-1',
      ',noname@example.com,222,ext-2',
      'Veli,not-an-email,333,ext-3',
      'Ayse,ali@example.com,999,ext-9',
    ].join('\n');

    const result = await service.importCsv(event.id, asUploadedCsv(csv));

    expect(result.success).toBe(true);
    expect(result.data.total).toBe(4);
    expect(result.data.success).toBe(2);
    expect(result.data.failed).toBe(2);

    const listed = await service.list(event.id, {
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

  it('upserts csv rows by phone when email is missing', async () => {
    const event = await seedEvent();

    await service.createManual(event.id, {
      name: 'Elle Girilen',
      phone: '+90 555 111 22 33',
    });

    const csv = [
      'name,email,phone,external_id',
      'CSV Kisi,,0555 111 22 33,ext-phone',
    ].join('\n');

    const result = await service.importCsv(event.id, asUploadedCsv(csv));
    const listed = await service.list(event.id, {
      page: 1,
      limit: 20,
      search: 'CSV Kisi',
    });

    expect(result.success).toBe(true);
    expect(result.data.success).toBe(1);
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].name).toBe('CSV Kisi');
    expect(listed.data[0].source).toBe('csv');
  });

  it('removes participant by id', async () => {
    const event = await seedEvent();

    const created = await service.createManual(event.id, {
      name: 'Silinecek Kisi',
      email: 'remove@example.com',
      phone: '555',
    });

    const removed = await service.remove(event.id, created.data.id);

    expect(removed.success).toBe(true);

    const listed = await service.list(event.id, {
      page: 1,
      limit: 20,
      search: undefined,
    });
    expect(listed.data).toHaveLength(0);
  });

  it('throws bad request for empty csv file', async () => {
    const event = await seedEvent();

    await expect(
      service.importCsv(event.id, asUploadedCsv('')),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws not found when event does not exist', async () => {
    await expect(
      service.createManual('missing-event', {
        name: 'Ahmet',
        email: 'ahmet@example.com',
        phone: '555',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
