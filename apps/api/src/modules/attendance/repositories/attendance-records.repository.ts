import { Injectable } from '@nestjs/common';

import { AttendanceRecordEntity } from '../attendance.types';

type CreateAttendanceRecordInput = Omit<
  AttendanceRecordEntity,
  'id' | 'createdAt'
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
}
