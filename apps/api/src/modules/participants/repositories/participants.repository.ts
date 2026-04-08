import { Injectable } from '@nestjs/common';

import { ParticipantEntity, ParticipantSource } from '../participants.types';

type CreateParticipantInput = {
  eventId: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: ParticipantSource;
  externalId: string | null;
};

type CsvParticipantInput = {
  name: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
};

type FindByEventInput = {
  eventId: string;
  page: number;
  limit: number;
  search?: string;
};

@Injectable()
export class ParticipantsRepository {
  private readonly participants = new Map<string, ParticipantEntity>();

  create(input: CreateParticipantInput): ParticipantEntity {
    const participant: ParticipantEntity = {
      id: crypto.randomUUID(),
      eventId: input.eventId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      source: input.source,
      externalId: input.externalId,
      createdAt: new Date().toISOString(),
    };

    this.participants.set(participant.id, participant);

    return participant;
  }

  findAllByEvent({ eventId, page, limit, search }: FindByEventInput) {
    const normalizedSearch = search?.trim().toLowerCase();

    const filtered = [...this.participants.values()]
      .filter((participant) => participant.eventId === eventId)
      .filter((participant) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = [
          participant.name,
          participant.email,
          participant.phone,
          participant.externalId,
        ]
          .filter((value): value is string => Boolean(value))
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      items,
      page,
      limit,
      total,
      totalPages,
    };
  }

  findByEventAndId(
    eventId: string,
    participantId: string,
  ): ParticipantEntity | null {
    const participant = this.participants.get(participantId);

    if (!participant || participant.eventId !== eventId) {
      return null;
    }

    return participant;
  }

  findByEventAndEmail(
    eventId: string,
    email: string,
  ): ParticipantEntity | null {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    return (
      [...this.participants.values()].find(
        (participant) =>
          participant.eventId === eventId &&
          participant.email?.toLowerCase() === normalizedEmail,
      ) ?? null
    );
  }

  remove(eventId: string, participantId: string): ParticipantEntity | null {
    const participant = this.findByEventAndId(eventId, participantId);

    if (!participant) {
      return null;
    }

    this.participants.delete(participantId);

    return participant;
  }

  bulkUpsertFromCsv(
    eventId: string,
    rows: CsvParticipantInput[],
  ): ParticipantEntity[] {
    const upserted: ParticipantEntity[] = [];

    for (const row of rows) {
      const normalizedEmail = row.email?.toLowerCase() ?? null;
      const existing = normalizedEmail
        ? [...this.participants.values()].find(
            (participant) =>
              participant.eventId === eventId &&
              participant.email?.toLowerCase() === normalizedEmail,
          )
        : null;

      if (existing) {
        const updated: ParticipantEntity = {
          ...existing,
          name: row.name,
          email: normalizedEmail,
          phone: row.phone,
          source: 'csv',
          externalId: row.externalId,
        };

        this.participants.set(updated.id, updated);
        upserted.push(updated);
        continue;
      }

      const created = this.create({
        eventId,
        name: row.name,
        email: normalizedEmail,
        phone: row.phone,
        source: 'csv',
        externalId: row.externalId,
      });

      upserted.push(created);
    }

    return upserted;
  }
}
