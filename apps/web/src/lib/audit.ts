import { apiFetch } from "@/lib/api";

export type AuditLogItem = {
  id: string;
  adminId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadataJson: Record<string, unknown> | null;
  createdAt: string;
};

export type ListAuditLogsResponse = {
  success: true;
  data: AuditLogItem[];
};

export async function listAuditLogs(limit = 100) {
  const params = new URLSearchParams({ limit: String(limit) });

  return apiFetch<ListAuditLogsResponse>(`/audit?${params.toString()}`);
}