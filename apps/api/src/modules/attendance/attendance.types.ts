export const ATTENDANCE_ATTEMPT_RESULTS = ['success', 'failed'] as const;

export type AttendanceAttemptResult =
  (typeof ATTENDANCE_ATTEMPT_RESULTS)[number];

export const ATTENDANCE_SCAN_ERROR_CODES = [
  'MALFORMED_TOKEN',
  'EXPIRED_TOKEN',
  'INVALID_SIGNATURE',
  'REPLAY_ATTACK',
  'SESSION_NOT_FOUND',
  'SESSION_INACTIVE',
  'LOCATION_OUT_OF_RANGE',
  'NO_LOCATION_DATA',
  'ALREADY_CHECKED_IN',
  'REGISTRATION_REQUIRED',
] as const;

export type AttendanceScanErrorCode =
  (typeof ATTENDANCE_SCAN_ERROR_CODES)[number];

export type AttendanceRecordEntity = {
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
};

export type AttendanceAttemptEntity = {
  id: string;
  sessionId: string;
  ip: string | null;
  userAgent: string | null;
  latitude: number | null;
  longitude: number | null;
  scannedAt: string;
  result: AttendanceAttemptResult;
  reason: string | null;
  createdAt: string;
};
