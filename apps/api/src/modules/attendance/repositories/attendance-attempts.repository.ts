import { Injectable } from '@nestjs/common';

import {
  AttendanceAttemptEntity,
  AttendanceAttemptResult,
} from '../attendance.types';

type CreateAttendanceAttemptInput = {
  sessionId: string;
  ip: string | null;
  userAgent: string | null;
  latitude: number | null;
  longitude: number | null;
  scannedAt: string;
  result: AttendanceAttemptResult;
  reason: string | null;
};

@Injectable()
export class AttendanceAttemptsRepository {
  private readonly attempts = new Map<string, AttendanceAttemptEntity>();

  create(input: CreateAttendanceAttemptInput): AttendanceAttemptEntity {
    const attempt: AttendanceAttemptEntity = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };

    this.attempts.set(attempt.id, attempt);

    return attempt;
  }

  findBySessionId(sessionId: string) {
    return [...this.attempts.values()].filter(
      (attempt) => attempt.sessionId === sessionId,
    );
  }
}
