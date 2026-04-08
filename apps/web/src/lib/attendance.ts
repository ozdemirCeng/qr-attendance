import { apiFetch } from "@/lib/api";

export type ScanAttendancePayload = {
  token: string;
  lat?: number;
  lng?: number;
  locationAccuracy?: number;
  email?: string;
  name?: string;
  phone?: string;
  fingerprint?: string;
};

export type ScanAttendanceSuccessResponse = {
  success: true;
  action: "CHECKED_IN";
  data: {
    attendanceId: string;
    participant: {
      id: string;
      name: string;
    };
    event: {
      id: string;
      name: string;
    };
    session: {
      id: string;
      name: string;
    };
  };
};

export async function scanAttendance(payload: ScanAttendancePayload) {
  return apiFetch<ScanAttendanceSuccessResponse>("/attendance/scan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
