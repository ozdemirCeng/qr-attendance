import { Injectable } from '@nestjs/common';

import { AttendanceRecordEntity } from '../attendance.types';

type CreateAttendanceRecordInput = Omit<
  AttendanceRecordEntity,
  'id' | 'createdAt'
>;

type ListAttendanceRecordsInput = {
  eventId: string;
  sessionId?: string;
  search?: string;
  isValid?: boolean;
  page: number;
  limit: number;
};

type UpdateAttendanceRecordInput = Partial<
  Pick<AttendanceRecordEntity, 'isValid' | 'invalidReason'>
>;

@Injectable()
export class AttendanceRecordsRepository {
  private readonly records = new Map<string, AttendanceRecordEntity>();

  create(input: CreateAttendanceRecordInput): AttendanceRecordEntity {
    const record: AttendanceRecordEntity = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };

    this.records.set(record.id, record);

    return record;
  }

  findByParticipantAndSession(participantId: string, sessionId: string) {
    return (
      [...this.records.values()].find(
        (record) =>
          record.participantId === participantId &&
          record.sessionId === sessionId,
      ) ?? null
    );
  }

  findBySessionId(sessionId: string) {
    return [...this.records.values()].filter(
      (record) => record.sessionId === sessionId,
    );
  }

  findByEventId(eventId: string) {
    return [...this.records.values()]
      .filter((record) => record.eventId === eventId)
      .sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
  }

  findAllByEvent({
    eventId,
    sessionId,
    search,
    isValid,
    page,
    limit,
  }: ListAttendanceRecordsInput) {
    const normalizedSearch = search?.trim().toLowerCase();

    const filtered = this.findByEventId(eventId)
      .filter((record) => {
        if (!sessionId) {
          return true;
        }

        return record.sessionId === sessionId;
      })
      .filter((record) => {
        if (typeof isValid !== 'boolean') {
          return true;
        }

        return record.isValid === isValid;
      })
      .filter((record) => {
        if (!normalizedSearch) {
          return true;
        }

        const haystack = [record.fullName, record.email, record.phone]
          .filter((value): value is string => Boolean(value))
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      });

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

  findById(id: string): AttendanceRecordEntity | null {
    return this.records.get(id) ?? null;
  }

  update(
    id: string,
    patch: UpdateAttendanceRecordInput,
  ): AttendanceRecordEntity | null {
    const current = this.findById(id);

    if (!current) {
      return null;
    }

    const updated: AttendanceRecordEntity = {
      ...current,
      ...patch,
    };

    this.records.set(id, updated);

    return updated;
  }
}
