import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RequestUser } from '../../../common/types/request-user.type';
import { CreateEventDto } from '../dto/create-event.dto';
import { ListEventsQueryDto } from '../dto/list-events-query.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { EventsRepository } from '../repositories/events.repository';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async list(query: ListEventsQueryDto) {
    const result = await this.eventsRepository.findAll({
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

  async create(payload: CreateEventDto, user?: RequestUser) {
    this.validateDateRange(payload.startsAt, payload.endsAt);

    const event = await this.eventsRepository.create({
      name: payload.name,
      description: payload.description ?? null,
      locationName: payload.locationName,
      latitude: payload.latitude,
      longitude: payload.longitude,
      radiusMeters: payload.radiusMeters,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      status: payload.status ?? 'draft',
      createdBy: user?.id ?? 'system',
    });

    return { success: true, data: event };
  }

  async stats() {
    const stats = await this.eventsRepository.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  async detail(id: string) {
    const event = await this.eventsRepository.findById(id);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    return { success: true, data: event };
  }

  async update(id: string, payload: UpdateEventDto) {
    const current = await this.eventsRepository.findById(id);

    if (!current) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    const startsAt = payload.startsAt ?? current.startsAt;
    const endsAt = payload.endsAt ?? current.endsAt;
    this.validateDateRange(startsAt, endsAt);

    const updated = await this.eventsRepository.update(id, {
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

  async remove(id: string) {
    const removed = await this.eventsRepository.softDelete(id);

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
