import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EventsRepository } from '../../events/repositories/events.repository';
import { ParticipantsRepository } from '../../participants/repositories/participants.repository';
import { QrVerificationCode } from '../../qr/qr.types';
import { QrTokenService } from '../../qr/services/qr-token.service';
import { SessionEntity } from '../../sessions/sessions.types';
import { SessionsRepository } from '../../sessions/repositories/sessions.repository';
import { ScanAttendanceDto } from '../dto/scan-attendance.dto';
import { AttendanceAttemptsRepository } from '../repositories/attendance-attempts.repository';
import { AttendanceRecordsRepository } from '../repositories/attendance-records.repository';
import { AttendanceScanErrorCode } from '../attendance.types';

type ScanRequestMeta = {
  ip?: string | null;
  userAgent?: string | string[] | null;
};

type LocationCheckResult = {
  valid: boolean;
  distance: number;
  reason?: 'NO_LOCATION_DATA' | 'LOCATION_OUT_OF_RANGE';
};

@Injectable()
export class AttendanceService {
  constructor(
    private readonly configService: ConfigService,
    private readonly qrTokenService: QrTokenService,
    private readonly sessionsRepository: SessionsRepository,
    private readonly eventsRepository: EventsRepository,
    private readonly participantsRepository: ParticipantsRepository,
    private readonly attendanceRecordsRepository: AttendanceRecordsRepository,
    private readonly attendanceAttemptsRepository: AttendanceAttemptsRepository,
  ) {}

  async scan(payload: ScanAttendanceDto, meta: ScanRequestMeta = {}) {
    const scannedAt = new Date().toISOString();
    const rotationSeconds = this.configService.get<number>(
      'QR_ROTATION_SECONDS',
      60,
    );
    const ip = this.normalizeNullable(meta.ip);
    const userAgent = this.normalizeUserAgent(meta.userAgent);

    let sessionIdForAttempt =
      this.extractSessionIdFromToken(payload.token) ?? 'unknown-session';

    try {
      const verification = await this.qrTokenService.verifyToken(
        payload.token,
        rotationSeconds,
      );

      if (!verification.valid) {
        throw this.scanError(
          this.mapQrVerificationCode(verification.code),
          this.messageForQrVerificationCode(verification.code),
        );
      }

      sessionIdForAttempt = verification.sessionId;

      const session = this.sessionsRepository.findById(verification.sessionId);
      if (!session) {
        throw this.scanError(
          'SESSION_NOT_FOUND',
          'QR tokenina ait oturum bulunamadi.',
          404,
        );
      }

      if (!this.isSessionActive(session, scannedAt)) {
        throw this.scanError('SESSION_INACTIVE', 'Oturum aktif degil.');
      }

      const event = this.eventsRepository.findById(session.eventId);
      if (!event) {
        throw this.scanError(
          'SESSION_NOT_FOUND',
          'Oturuma ait etkinlik bulunamadi.',
          404,
        );
      }

      const locationCheck = this.validateLocation(
        payload,
        {
          latitude: event.latitude,
          longitude: event.longitude,
        },
        event.radiusMeters,
      );

      if (!locationCheck.valid) {
        if (locationCheck.reason === 'NO_LOCATION_DATA') {
          throw this.scanError('NO_LOCATION_DATA', 'Konum bilgisi zorunludur.');
        }

        throw this.scanError(
          'LOCATION_OUT_OF_RANGE',
          'Konum etkinlik alani disinda.',
        );
      }

      const participant = this.resolveParticipant(event.id, payload);

      if (!participant) {
        throw this.scanError(
          'REGISTRATION_REQUIRED',
          'Kayit bulunamadi. Katilimci bilgisi gerekli.',
        );
      }

      const existingRecord =
        this.attendanceRecordsRepository.findByParticipantAndSession(
          participant.id,
          session.id,
        );

      if (existingRecord) {
        throw this.scanError(
          'ALREADY_CHECKED_IN',
          'Bu katilimci bu oturum icin zaten kayitli.',
          409,
        );
      }

      const record = this.attendanceRecordsRepository.create({
        eventId: event.id,
        sessionId: session.id,
        participantId: participant.id,
        fullName: participant.name,
        email: participant.email,
        phone: participant.phone,
        scannedAt,
        latitude: payload.lat ?? null,
        longitude: payload.lng ?? null,
        accuracy: payload.locationAccuracy ?? null,
        distanceFromVenue: locationCheck.distance,
        isValid: true,
        invalidReason: null,
        qrNonce: verification.nonce,
        ipAddress: ip,
        deviceFingerprint: this.normalizeNullable(payload.fingerprint),
      });

      this.attendanceAttemptsRepository.create({
        sessionId: session.id,
        ip,
        userAgent,
        latitude: payload.lat ?? null,
        longitude: payload.lng ?? null,
        scannedAt,
        result: 'success',
        reason: null,
      });

      return {
        success: true,
        action: 'CHECKED_IN',
        data: {
          attendanceId: record.id,
          participant: {
            id: participant.id,
            name: participant.name,
          },
          event: {
            id: event.id,
            name: event.name,
          },
          session: {
            id: session.id,
            name: session.name,
          },
        },
      };
    } catch (error: unknown) {
      const errorCode = this.extractErrorCode(error);

      this.attendanceAttemptsRepository.create({
        sessionId: sessionIdForAttempt,
        ip,
        userAgent,
        latitude: payload.lat ?? null,
        longitude: payload.lng ?? null,
        scannedAt,
        result: 'failed',
        reason: errorCode,
      });

      throw error;
    }
  }

  private resolveParticipant(eventId: string, payload: ScanAttendanceDto) {
    const normalizedEmail = this.normalizeEmail(payload.email);
    const normalizedName = this.normalizeNullable(payload.name);
    const normalizedPhone = this.normalizeNullable(payload.phone);

    if (normalizedEmail) {
      const existingParticipant =
        this.participantsRepository.findByEventAndEmail(
          eventId,
          normalizedEmail,
        );

      if (existingParticipant) {
        return existingParticipant;
      }
    }

    if (!normalizedName) {
      return null;
    }

    return this.participantsRepository.create({
      eventId,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      source: 'self_registered',
      externalId: null,
    });
  }

  private validateLocation(
    payload: ScanAttendanceDto,
    venue: { latitude: number; longitude: number },
    radiusMeters: number,
  ): LocationCheckResult {
    if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
      return {
        valid: false,
        distance: Number.POSITIVE_INFINITY,
        reason: 'NO_LOCATION_DATA',
      };
    }

    const distance = this.haversine(
      {
        latitude: payload.lat,
        longitude: payload.lng,
      },
      venue,
    );

    const accuracy = Math.max(0, payload.locationAccuracy ?? 0);
    const inRadius = distance <= radiusMeters;
    const inTolerance = distance - accuracy <= radiusMeters;

    if (!inRadius && !inTolerance) {
      return {
        valid: false,
        distance,
        reason: 'LOCATION_OUT_OF_RANGE',
      };
    }

    return {
      valid: true,
      distance,
    };
  }

  private haversine(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
  ) {
    const earthRadiusMeters = 6_371_000;
    const toRadians = (value: number) => (value * Math.PI) / 180;

    const deltaLatitude = toRadians(end.latitude - start.latitude);
    const deltaLongitude = toRadians(end.longitude - start.longitude);
    const latitude1 = toRadians(start.latitude);
    const latitude2 = toRadians(end.latitude);

    const sinHalfLat = Math.sin(deltaLatitude / 2);
    const sinHalfLon = Math.sin(deltaLongitude / 2);

    const h =
      sinHalfLat * sinHalfLat +
      Math.cos(latitude1) * Math.cos(latitude2) * sinHalfLon * sinHalfLon;

    return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
  }

  private isSessionActive(session: SessionEntity, nowIso: string) {
    const now = new Date(nowIso).getTime();
    const startsAt = new Date(session.startsAt).getTime();
    const endsAt = new Date(session.endsAt).getTime();

    if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
      return false;
    }

    return now >= startsAt && now <= endsAt;
  }

  private mapQrVerificationCode(
    code: QrVerificationCode,
  ): AttendanceScanErrorCode {
    const map: Record<QrVerificationCode, AttendanceScanErrorCode> = {
      INVALID_TOKEN: 'MALFORMED_TOKEN',
      INVALID_SIGNATURE: 'INVALID_SIGNATURE',
      EXPIRED_TOKEN: 'EXPIRED_TOKEN',
      REPLAY_ATTACK: 'REPLAY_ATTACK',
    };

    return map[code];
  }

  private messageForQrVerificationCode(code: QrVerificationCode) {
    const map: Record<QrVerificationCode, string> = {
      INVALID_TOKEN: 'QR token gecersiz.',
      INVALID_SIGNATURE: 'QR token imzasi gecersiz.',
      EXPIRED_TOKEN: 'QR token suresi dolmus.',
      REPLAY_ATTACK: 'QR token yeniden kullanilamaz.',
    };

    return map[code];
  }

  private scanError(
    code: AttendanceScanErrorCode,
    message: string,
    statusCode = 400,
  ): HttpException {
    if (statusCode === 404) {
      return new NotFoundException({ code, message, statusCode });
    }

    if (statusCode === 409) {
      return new ConflictException({ code, message, statusCode });
    }

    return new BadRequestException({ code, message, statusCode });
  }

  private extractErrorCode(error: unknown) {
    if (!(error instanceof HttpException)) {
      return 'INTERNAL_ERROR';
    }

    const payload = error.getResponse();

    if (typeof payload === 'object' && payload !== null) {
      const code = (payload as Record<string, unknown>).code;

      if (typeof code === 'string') {
        return code;
      }
    }

    return 'HTTP_EXCEPTION';
  }

  private extractSessionIdFromToken(rawToken: string) {
    try {
      const decoded = Buffer.from(rawToken, 'base64url').toString('utf-8');
      const parsed = JSON.parse(decoded) as { sid?: unknown };

      return typeof parsed.sid === 'string' ? parsed.sid : null;
    } catch {
      return null;
    }
  }

  private normalizeNullable(value: string | null | undefined) {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }

  private normalizeEmail(value: string | undefined) {
    return this.normalizeNullable(value)?.toLowerCase() ?? null;
  }

  private normalizeUserAgent(value: string | string[] | null | undefined) {
    if (Array.isArray(value)) {
      return this.normalizeNullable(value[0]);
    }

    return this.normalizeNullable(value);
  }
}
