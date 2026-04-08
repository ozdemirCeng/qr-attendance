import { Injectable } from '@nestjs/common';

import { SessionEntity } from '../sessions.types';

type CreateSessionInput = {
  eventId: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

type UpdateSessionInput = Partial<Omit<CreateSessionInput, 'eventId'>>;

@Injectable()
export class SessionsRepository {
  private readonly sessions = new Map<string, SessionEntity>();

  create(input: CreateSessionInput): SessionEntity {
    const session: SessionEntity = {
      id: crypto.randomUUID(),
      eventId: input.eventId,
      name: input.name,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(session.id, session);

    return session;
  }

  findByEventId(eventId: string): SessionEntity[] {
    return [...this.sessions.values()]
      .filter((session) => session.eventId === eventId)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  findActiveByEventId(
    eventId: string,
    nowIso = new Date().toISOString(),
  ): SessionEntity | null {
    const now = new Date(nowIso).getTime();

    return (
      this.findByEventId(eventId).find((session) => {
        const startsAt = new Date(session.startsAt).getTime();
        const endsAt = new Date(session.endsAt).getTime();

        if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
          return false;
        }

        return now >= startsAt && now <= endsAt;
      }) ?? null
    );
  }

  findByEventAndId(eventId: string, sessionId: string): SessionEntity | null {
    const session = this.sessions.get(sessionId);

    if (!session || session.eventId !== eventId) {
      return null;
    }

    return session;
  }

  update(
    eventId: string,
    sessionId: string,
    patch: UpdateSessionInput,
  ): SessionEntity | null {
    const current = this.findByEventAndId(eventId, sessionId);

    if (!current) {
      return null;
    }

    const updated: SessionEntity = {
      ...current,
      ...patch,
    };

    this.sessions.set(sessionId, updated);

    return updated;
  }

  remove(eventId: string, sessionId: string): SessionEntity | null {
    const current = this.findByEventAndId(eventId, sessionId);

    if (!current) {
      return null;
    }

    this.sessions.delete(sessionId);

    return current;
  }
}
