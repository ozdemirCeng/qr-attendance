import { Injectable } from '@nestjs/common';

import { AuditLogEntity } from '../audit.types';

type CreateAuditLogInput = Omit<AuditLogEntity, 'id' | 'createdAt'>;

@Injectable()
export class AuditRepository {
  private readonly logs: AuditLogEntity[] = [];

  create(input: CreateAuditLogInput): AuditLogEntity {
    const log: AuditLogEntity = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };

    this.logs.unshift(log);

    if (this.logs.length > 2_000) {
      this.logs.length = 2_000;
    }

    return log;
  }

  listLatest(limit = 100): AuditLogEntity[] {
    const safeLimit = Math.max(1, Math.min(500, limit));

    return this.logs.slice(0, safeLimit);
  }
}
