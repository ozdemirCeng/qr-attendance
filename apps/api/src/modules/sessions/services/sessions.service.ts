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

  create(eventId: string, payload: CreateSessionDto) {
    this.ensureEventExists(eventId);
    this.validateDateRange(payload.startsAt, payload.endsAt);

    const session = this.sessionsRepository.create({
      eventId,
      name: payload.name,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
    });

    return { success: true, data: session };
  }

  list(eventId: string) {
    this.ensureEventExists(eventId);

    return {
      success: true,
      data: this.sessionsRepository.findByEventId(eventId),
    };
  }

  update(eventId: string, sessionId: string, payload: UpdateSessionDto) {
    this.ensureEventExists(eventId);

    const current = this.sessionsRepository.findByEventAndId(
      eventId,
      sessionId,
    );

    if (!current) {
      throw new NotFoundException('Oturum bulunamadi.');
    }

    const startsAt = payload.startsAt ?? current.startsAt;
    const endsAt = payload.endsAt ?? current.endsAt;
    this.validateDateRange(startsAt, endsAt);

    const updated = this.sessionsRepository.update(eventId, sessionId, {
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

  remove(eventId: string, sessionId: string) {
    this.ensureEventExists(eventId);

    const removed = this.sessionsRepository.remove(eventId, sessionId);

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

  private ensureEventExists(eventId: string) {
    const event = this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }
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
}
