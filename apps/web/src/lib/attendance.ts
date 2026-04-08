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

export type AttendanceRegistrationType = "walkIn" | "registered";

export type AttendanceRecordItem = {
  id: string;
  eventId: string;
  sessionId: string;
  participantId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  scannedAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  distanceFromVenue: number | null;
  isValid: boolean;
  invalidReason: string | null;
  qrNonce: string | null;
  ipAddress: string | null;
  deviceFingerprint: string | null;
  createdAt: string;
  registrationType: AttendanceRegistrationType;
};

export type ListAttendanceResponse = {
  success: true;
  data: AttendanceRecordItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AttendanceStatsResponse = {
  success: true;
  data: {
    total: number;
    valid: number;
    invalid: number;
    walkIn: number;
    registered: number;
  };
};

export type UpdateManualAttendanceStatusResponse = {
  success: true;
  data: AttendanceRecordItem;
};

type ListAttendanceInput = {
  page?: number;
  limit?: number;
  search?: string;
  sessionId?: string;
  isValid?: boolean;
};

export async function scanAttendance(payload: ScanAttendancePayload) {
  return apiFetch<ScanAttendanceSuccessResponse>("/attendance/scan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listAttendance(eventId: string, input: ListAttendanceInput = {}) {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });

  if (input.search?.trim()) {
    params.set("search", input.search.trim());
  }

  if (input.sessionId) {
    params.set("sessionId", input.sessionId);
  }

  if (typeof input.isValid === "boolean") {
    params.set("isValid", String(input.isValid));
  }

  return apiFetch<ListAttendanceResponse>(
    `/events/${eventId}/attendance?${params.toString()}`,
  );
}

export async function getAttendanceStats(eventId: string) {
  return apiFetch<AttendanceStatsResponse>(`/events/${eventId}/attendance/stats`);
}

export async function updateAttendanceManualStatus(
  attendanceId: string,
  payload: { isValid: boolean; reason?: string },
) {
  return apiFetch<UpdateManualAttendanceStatusResponse>(
    `/attendance/${attendanceId}/manual-status`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
