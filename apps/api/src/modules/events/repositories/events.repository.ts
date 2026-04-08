import { Injectable } from '@nestjs/common';

import { EventEntity, EventStatus } from '../events.types';

type CreateEventInput = {
  name: string;
  description: string | null;
  locationName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
};

type UpdateEventInput = Partial<CreateEventInput>;

type PaginationInput = {
  page: number;
  limit: number;
};

@Injectable()
export class EventsRepository {
  private readonly events = new Map<string, EventEntity>();

  create(input: CreateEventInput): EventEntity {
    const now = new Date().toISOString();

    const event: EventEntity = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      locationName: input.locationName,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: input.radiusMeters,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status,
      createdAt: now,
      deletedAt: null,
    };

    this.events.set(event.id, event);

    return event;
  }

  findAll({ page, limit }: PaginationInput) {
    const activeItems = [...this.events.values()]
      .filter((event) => event.deletedAt === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = activeItems.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const items = activeItems.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      totalPages,
      page,
      limit,
    };
  }

  findById(id: string): EventEntity | null {
    const event = this.events.get(id);

    if (!event || event.deletedAt !== null) {
      return null;
    }

    return event;
  }

  update(id: string, patch: UpdateEventInput): EventEntity | null {
    const current = this.findById(id);

    if (!current) {
      return null;
    }

    const updated: EventEntity = {
      ...current,
      ...patch,
    };

    this.events.set(id, updated);

    return updated;
  }

  softDelete(id: string): EventEntity | null {
    const current = this.findById(id);

    if (!current) {
      return null;
    }

    const deleted: EventEntity = {
      ...current,
      status: 'archived',
      deletedAt: new Date().toISOString(),
    };

    this.events.set(id, deleted);

    return deleted;
  }
}
