import { SetMetadata } from '@nestjs/common';

export type AuditOptions = {
  action: string;
  entityType: string;
  entityIdParam?: string;
  entityIdBody?: string;
  entityIdResponsePath?: string;
};

export const AUDIT_METADATA_KEY = 'audit:options';

export const Audit = (options: AuditOptions) =>
  SetMetadata(AUDIT_METADATA_KEY, options);
