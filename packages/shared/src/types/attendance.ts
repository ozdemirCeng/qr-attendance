export type AttendanceAttemptResult = 'success' | 'failed';

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
