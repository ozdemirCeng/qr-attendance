import { Injectable } from '@nestjs/common';

import { AuditLogEntity } from '../audit.types';
import { AuditRepository } from '../repositories/audit.repository';

type AuditLogInput = {
  adminId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadataJson: Record<string, unknown> | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  log(input: AuditLogInput): AuditLogEntity {
    return this.auditRepository.create({
      adminId: input.adminId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataJson: input.metadataJson,
    });
  }

  listLatest(limit = 100) {
    return this.auditRepository.listLatest(limit);
  }
}
