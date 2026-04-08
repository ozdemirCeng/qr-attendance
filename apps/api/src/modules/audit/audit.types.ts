export type AuditLogEntity = {
  id: string;
  adminId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
};
