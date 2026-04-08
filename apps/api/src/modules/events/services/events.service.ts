import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateEventDto } from '../dto/create-event.dto';
import { ListEventsQueryDto } from '../dto/list-events-query.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { EventsRepository } from '../repositories/events.repository';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  list(query: ListEventsQueryDto) {
    const result = this.eventsRepository.findAll({
      page: query.page,
      limit: query.limit,
    });

    return {
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  create(payload: CreateEventDto) {
    this.validateDateRange(payload.startsAt, payload.endsAt);

    const event = this.eventsRepository.create({
      name: payload.name,
      description: payload.description ?? null,
      locationName: payload.locationName,
      latitude: payload.latitude,
      longitude: payload.longitude,
      radiusMeters: payload.radiusMeters,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      status: payload.status ?? 'draft',
    });

    return { success: true, data: event };
  }

  detail(id: string) {
    const event = this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    return { success: true, data: event };
  }

  update(id: string, payload: UpdateEventDto) {
    const current = this.eventsRepository.findById(id);

    if (!current) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    const startsAt = payload.startsAt ?? current.startsAt;
    const endsAt = payload.endsAt ?? current.endsAt;
    this.validateDateRange(startsAt, endsAt);

    const updated = this.eventsRepository.update(id, {
      name: payload.name,
      description: payload.description ?? current.description,
      locationName: payload.locationName,
      latitude: payload.latitude,
      longitude: payload.longitude,
      radiusMeters: payload.radiusMeters,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      status: payload.status,
    });

    if (!updated) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    return { success: true, data: updated };
  }

  remove(id: string) {
    const removed = this.eventsRepository.softDelete(id);

    if (!removed) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    return {
      success: true,
      data: {
        id: removed.id,
        deletedAt: removed.deletedAt,
      },
    };
  }

  private validateDateRange(startsAt: string, endsAt: string) {
    const startsAtDate = new Date(startsAt);
    const endsAtDate = new Date(endsAt);

    if (
      Number.isNaN(startsAtDate.getTime()) ||
      Number.isNaN(endsAtDate.getTime())
    ) {
      throw new BadRequestException('Tarih alani gecersiz.');
    }

    if (endsAtDate <= startsAtDate) {
      throw new BadRequestException(
        'Etkinlik bitis zamani baslangic zamanindan sonra olmalidir.',
      );
    }
  }
}
