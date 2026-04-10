import { WEB_API_PROXY_PREFIX, apiFetch } from "@/lib/api";

export type AttendanceExportStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export type RequestAttendanceExportResponse = {
  success: true;
  data: {
    exportId: string;
    message: string;
  };
};

export type AttendanceExportStatusResponse = {
  success: true;
  data: {
    exportId: string;
    status: AttendanceExportStatus;
    progress: number;
    downloadUrl: string | null;
    errorMessage: string | null;
  };
};

export async function requestAttendanceExport(eventId: string) {
  return apiFetch<RequestAttendanceExportResponse>(
    `/events/${eventId}/attendance/export`,
    {
      method: "POST",
    },
  );
}

export async function getAttendanceExportStatus(exportId: string) {
  return apiFetch<AttendanceExportStatusResponse>(
    `/exports/${exportId}/status`,
  );
}

export function resolveAttendanceExportDownloadUrl(downloadPath: string) {
  return `${WEB_API_PROXY_PREFIX}${downloadPath}`;
}
