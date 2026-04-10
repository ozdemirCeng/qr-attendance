import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EventsRepository } from '../../events/repositories/events.repository';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { SessionsRepository } from '../repositories/sessions.repository';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly eventsRepository: EventsRepository,
  ) {}

  async create(eventId: string, payload: CreateSessionDto) {
    const event = await this.ensureEventExists(eventId);
    this.validateDateRange(payload.startsAt, payload.endsAt);
    this.validateSessionWithinEventWindow(
      event.startsAt,
      event.endsAt,
      payload.startsAt,
      payload.endsAt,
    );
    await this.ensureNoOverlap(eventId, payload.startsAt, payload.endsAt);

    const session = await this.sessionsRepository.create({
      eventId,
      name: payload.name,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
    });

    return { success: true, data: session };
  }

  async list(eventId: string) {
    await this.ensureEventExists(eventId);

    return {
      success: true,
      data: await this.sessionsRepository.findByEventId(eventId),
    };
  }

  async update(eventId: string, sessionId: string, payload: UpdateSessionDto) {
    const event = await this.ensureEventExists(eventId);

    const current = await this.sessionsRepository.findByEventAndId(
      eventId,
      sessionId,
    );

    if (!current) {
      throw new NotFoundException('Oturum bulunamadi.');
    }

    const startsAt = payload.startsAt ?? current.startsAt;
    const endsAt = payload.endsAt ?? current.endsAt;
    this.validateDateRange(startsAt, endsAt);
    this.validateSessionWithinEventWindow(
      event.startsAt,
      event.endsAt,
      startsAt,
      endsAt,
    );
    await this.ensureNoOverlap(eventId, startsAt, endsAt, sessionId);

    const updated = await this.sessionsRepository.update(eventId, sessionId, {
      name: payload.name,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
    });

    if (!updated) {
      throw new NotFoundException('Oturum bulunamadi.');
    }

    return {
      success: true,
      data: updated,
    };
  }

  async remove(eventId: string, sessionId: string) {
    await this.ensureEventExists(eventId);

    const removed = await this.sessionsRepository.remove(eventId, sessionId);

    if (!removed) {
      throw new NotFoundException('Oturum bulunamadi.');
    }

    return {
      success: true,
      data: {
        id: removed.id,
      },
    };
  }

  private async ensureEventExists(eventId: string) {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }

    return event;
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
        'Oturum bitis zamani baslangic zamanindan sonra olmalidir.',
      );
    }
  }

  private validateSessionWithinEventWindow(
    eventStartsAt: string,
    eventEndsAt: string,
    sessionStartsAt: string,
    sessionEndsAt: string,
  ) {
    const eventStart = new Date(eventStartsAt);
    const eventEnd = new Date(eventEndsAt);
    const sessionStart = new Date(sessionStartsAt);
    const sessionEnd = new Date(sessionEndsAt);

    if (sessionStart < eventStart || sessionEnd > eventEnd) {
      throw new BadRequestException(
        'Oturum zaman araligi etkinlik zaman araligi icinde olmalidir.',
      );
    }
  }

  private async ensureNoOverlap(
    eventId: string,
    startsAt: string,
    endsAt: string,
    ignoredSessionId?: string,
  ) {
    const nextStart = new Date(startsAt).getTime();
    const nextEnd = new Date(endsAt).getTime();
    const existingSessions =
      await this.sessionsRepository.findByEventId(eventId);
    const hasOverlap = existingSessions.some((session) => {
      if (session.id === ignoredSessionId) {
        return false;
      }

      const currentStart = new Date(session.startsAt).getTime();
      const currentEnd = new Date(session.endsAt).getTime();

      return nextStart < currentEnd && nextEnd > currentStart;
    });

    if (hasOverlap) {
      throw new BadRequestException(
        'Ayni etkinlik icinde cakisan oturum zaman araligi olusturulamaz.',
      );
    }
  }
}
