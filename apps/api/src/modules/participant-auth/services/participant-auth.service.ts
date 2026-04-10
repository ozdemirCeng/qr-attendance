import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import {
  getSql,
  isDatabaseUniqueViolation,
  toIsoString,
} from '../../../common/database/neon';
import {
  ParticipantLoginDto,
  ParticipantSignupDto,
} from '../dto/participant-auth.dto';
import {
  ChangePasswordDto,
  UpdateParticipantProfileDto,
} from '../dto/update-profile.dto';
import { ParticipantUsersRepository } from '../repositories/participant-users.repository';

const scryptAsync = promisify(scrypt);

type ParticipantSessionPayload = {
  kind: 'participant';
  id: string;
  email: string;
  name: string;
  phone: string | null;
  exp: number;
};

type ParticipantDashboardEvent = {
  id: string;
  name: string;
  locationName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  registeredAt: string | null;
  attendedAt: string | null;
  isRegistered: boolean;
  isAttended: boolean;
};

@Injectable()
export class ParticipantAuthService {
  private readonly sessionSecret: string;
  private readonly sessionTtlSeconds = 60 * 60 * 24 * 7;
  private readonly cookieName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersRepository: ParticipantUsersRepository,
  ) {
    this.sessionSecret =
      this.configService.get<string>('QR_SECRET', '').trim() +
      '-participant';
    this.cookieName = this.configService.get<string>(
      'PARTICIPANT_COOKIE_NAME',
      'participant_session',
    );
  }

  async signup(payload: ParticipantSignupDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedPhone = payload.phone?.trim() || null;

    const existing = await this.usersRepository.findByEmail(normalizedEmail);

    if (existing) {
      throw new BadRequestException('Bu e-posta adresi zaten kayitli.');
    }

    const passwordHash = await this.hashPassword(payload.password);

    try {
      const user = await this.usersRepository.create({
        name: payload.name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        avatarDataUrl: null,
        passwordHash,
      });

      return this.createAuthResult(user);
    } catch (error) {
      if (isDatabaseUniqueViolation(error)) {
        throw new BadRequestException('Bu e-posta adresi zaten kayitli.');
      }

      throw error;
    }
  }

  async login(payload: ParticipantLoginDto) {
    const identifier = this.resolveLoginIdentifier(payload);
    const user = await this.usersRepository.findByIdentity(identifier);

    if (!user) {
      throw new UnauthorizedException('Giris bilgileri gecersiz.');
    }

    const isValid = await this.verifyPassword(
      payload.password,
      user.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Giris bilgileri gecersiz.');
    }

    return this.createAuthResult(user);
  }

  async updateProfile(
    userId: string,
    payload: UpdateParticipantProfileDto,
  ) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Kullanici bulunamadi.');
    }

    const normalizedName = payload.name?.trim();
    const normalizedEmail = payload.email?.trim().toLowerCase();
    const normalizedPhone = payload.phone?.trim() || undefined;
    const normalizedAvatarDataUrl = this.normalizeAvatarDataUrl(
      payload.avatarDataUrl,
    );

    if (normalizedEmail && normalizedEmail !== user.email) {
      const existing = await this.usersRepository.findByEmail(normalizedEmail);

      if (existing) {
        throw new BadRequestException('Bu e-posta zaten kullaniliyor.');
      }
    }

    const updated = await this.usersRepository.update(userId, {
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      avatarDataUrl: normalizedAvatarDataUrl,
    });

    if (!updated) {
      throw new BadRequestException('Profil guncellenemedi.');
    }

    return this.createAuthResult(updated);
  }

  async getMe(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Kullanici bulunamadi.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarDataUrl: user.avatarDataUrl,
    };
  }

  async changePassword(userId: string, payload: ChangePasswordDto) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Kullanici bulunamadi.');
    }

    const isValid = await this.verifyPassword(
      payload.currentPassword,
      user.passwordHash,
    );

    if (!isValid) {
      throw new BadRequestException('Mevcut sifre hatali.');
    }

    const newHash = await this.hashPassword(payload.newPassword);
    await this.usersRepository.updatePasswordHash(userId, newHash);

    return { success: true };
  }

  async getDashboard(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Kullanici bulunamadi.');
    }

    const [registeredEvents, attendedEvents] = await Promise.all([
      this.findRegisteredEvents(user.email, user.phone),
      this.findAttendedEvents(user.email, user.phone),
    ]);

    const eventMap = new Map<string, ParticipantDashboardEvent>();

    for (const event of registeredEvents) {
      eventMap.set(event.id, event);
    }

    for (const event of attendedEvents) {
      const current = eventMap.get(event.id);

      eventMap.set(event.id, {
        ...event,
        registeredAt: current?.registeredAt ?? event.registeredAt,
        isRegistered: current?.isRegistered ?? event.isRegistered,
      });
    }

    const now = Date.now();
    const events = Array.from(eventMap.values()).sort((left, right) => {
      const leftStart = new Date(left.startsAt).getTime();
      const rightStart = new Date(right.startsAt).getTime();
      const leftUpcoming = Number.isFinite(leftStart) && leftStart >= now;
      const rightUpcoming = Number.isFinite(rightStart) && rightStart >= now;

      if (leftUpcoming && !rightUpcoming) return -1;
      if (!leftUpcoming && rightUpcoming) return 1;
      if (leftUpcoming && rightUpcoming) return leftStart - rightStart;

      const leftAttendance = left.attendedAt
        ? new Date(left.attendedAt).getTime()
        : 0;
      const rightAttendance = right.attendedAt
        ? new Date(right.attendedAt).getTime()
        : 0;

      return rightAttendance - leftAttendance;
    });

    return {
      success: true,
      data: {
        profile: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatarDataUrl: user.avatarDataUrl,
        },
        summary: {
          registeredEvents: events.filter((event) => event.isRegistered).length,
          attendedEvents: events.filter((event) => event.isAttended).length,
          upcomingEvents: events.filter((event) => {
            const startsAt = new Date(event.startsAt).getTime();
            return Number.isFinite(startsAt) && startsAt >= now;
          }).length,
          completedEvents: events.filter((event) => {
            const endsAt = new Date(event.endsAt).getTime();
            return Number.isFinite(endsAt) && endsAt < now;
          }).length,
        },
        events,
      },
    };
  }

  resolveSessionFromCookie(
    cookieHeader?: string,
  ): ParticipantSessionPayload | null {
    if (!cookieHeader) return null;

    const token = this.getCookieValue(cookieHeader, this.cookieName);

    if (!token || !token.includes('.')) return null;

    const [encodedPayload, providedSignature] = token.split('.', 2);

    if (!encodedPayload || !providedSignature) return null;

    const expectedSignature = this.signValue(encodedPayload);
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

    try {
      const decoded = Buffer.from(encodedPayload, 'base64url').toString(
        'utf8',
      );
      const payload = JSON.parse(decoded) as ParticipantSessionPayload;

      if (
        payload.kind !== 'participant' ||
        typeof payload.id !== 'string' ||
        typeof payload.email !== 'string' ||
        typeof payload.name !== 'string' ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }

      if (payload.exp <= Date.now()) return null;

      return {
        ...payload,
        phone: payload.phone ?? null,
      };
    } catch {
      return null;
    }
  }

  createLogoutHeaders() {
    const secure = this.isSecure() ? '; Secure' : '';
    const sameSite = this.isCrossSite() ? 'None' : 'Lax';

    return [
      `${this.cookieName}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${secure}`,
    ];
  }

  getSessionCookieName() {
    return this.cookieName;
  }

  private createAuthResult(user: Awaited<ReturnType<ParticipantUsersRepository['findById']>>) {
    if (!user) {
      throw new UnauthorizedException('Kullanici bulunamadi.');
    }

    const token = this.createSessionToken({
      kind: 'participant',
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      exp: Date.now() + this.sessionTtlSeconds * 1000,
    });

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarDataUrl: user.avatarDataUrl,
      },
      setCookieHeaders: [this.createCookieHeader(token)],
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${salt}:${derived.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    stored: string,
  ): Promise<boolean> {
    const [salt, hash] = stored.split(':');

    if (!salt || !hash) return false;

    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedBuffer = Buffer.from(hash, 'hex');

    if (derived.length !== storedBuffer.length) return false;

    return timingSafeEqual(derived, storedBuffer);
  }

  private createSessionToken(payload: ParticipantSessionPayload) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = this.signValue(encoded);

    return `${encoded}.${signature}`;
  }

  private createCookieHeader(token: string) {
    const secure = this.isSecure() ? '; Secure' : '';
    const sameSite = this.isCrossSite() ? 'None' : 'Lax';

    return `${this.cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${this.sessionTtlSeconds}${secure}`;
  }

  private signValue(value: string) {
    return createHmac('sha256', this.sessionSecret)
      .update(value)
      .digest('base64url');
  }

  private getCookieValue(cookieHeader: string, name: string) {
    for (const cookie of cookieHeader.split(';')) {
      const [rawKey, ...rawValueParts] = cookie.trim().split('=');

      if (rawKey !== name) continue;

      try {
        return decodeURIComponent(rawValueParts.join('='));
      } catch {
        return rawValueParts.join('=');
      }
    }

    return null;
  }

  private async findRegisteredEvents(email: string, phone: string | null) {
    const sql = getSql();
    const normalizedPhone = this.normalizePhone(phone);
    const rows = (await sql.query(
      `
        select distinct on (e.id)
          e.id,
          e.name,
          e.location_name as "locationName",
          e.starts_at as "startsAt",
          e.ends_at as "endsAt",
          e.status,
          p.created_at as "registeredAt"
        from participants p
        inner join events e on e.id = p.event_id
        where e.deleted_at is null
          and (
            lower(coalesce(p.email, '')) = $1
            or ($2::text is not null and p.phone_normalized = $2::text)
          )
        order by e.id, p.created_at desc
      `,
      [email.toLowerCase(), normalizedPhone],
    )) as Array<{
      id: string;
      name: string;
      locationName: string;
      startsAt: Date | string;
      endsAt: Date | string;
      status: string;
      registeredAt: Date | string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      locationName: row.locationName,
      startsAt: toIsoString(row.startsAt),
      endsAt: toIsoString(row.endsAt),
      status: row.status,
      registeredAt: row.registeredAt ? toIsoString(row.registeredAt) : null,
      attendedAt: null,
      isRegistered: true,
      isAttended: false,
    }));
  }

  private async findAttendedEvents(email: string, phone: string | null) {
    const sql = getSql();
    const normalizedPhone = this.normalizePhone(phone);
    const rows = (await sql.query(
      `
        select
          e.id,
          e.name,
          e.location_name as "locationName",
          e.starts_at as "startsAt",
          e.ends_at as "endsAt",
          e.status,
          max(ar.scanned_at) as "attendedAt"
        from attendance_records ar
        inner join events e on e.id = ar.event_id
        where e.deleted_at is null
          and (
            lower(coalesce(ar.email, '')) = $1
            or (
              $2::text is not null
              and right(
                regexp_replace(coalesce(ar.phone, ''), '\D', '', 'g'),
                10
              ) = $2::text
            )
          )
        group by e.id, e.name, e.location_name, e.starts_at, e.ends_at, e.status
      `,
      [email.toLowerCase(), normalizedPhone],
    )) as Array<{
      id: string;
      name: string;
      locationName: string;
      startsAt: Date | string;
      endsAt: Date | string;
      status: string;
      attendedAt: Date | string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      locationName: row.locationName,
      startsAt: toIsoString(row.startsAt),
      endsAt: toIsoString(row.endsAt),
      status: row.status,
      registeredAt: null,
      attendedAt: row.attendedAt ? toIsoString(row.attendedAt) : null,
      isRegistered: false,
      isAttended: true,
    }));
  }

  private normalizeAvatarDataUrl(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    if (
      !normalized.startsWith('data:image/') ||
      !normalized.includes(';base64,')
    ) {
      throw new BadRequestException('Profil fotografi formati gecersiz.');
    }

    if (normalized.length > 500_000) {
      throw new BadRequestException('Profil fotografi boyutu cok buyuk.');
    }

    return normalized;
  }

  private normalizePhone(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const digits = value.replace(/\D/g, '');

    if (!digits) {
      return null;
    }

    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  private resolveLoginIdentifier(payload: ParticipantLoginDto) {
    if (typeof payload.identifier === 'string' && payload.identifier.trim()) {
      return payload.identifier.trim().toLowerCase();
    }

    if (typeof payload.email === 'string' && payload.email.trim()) {
      return payload.email.trim().toLowerCase();
    }

    return '';
  }

  private isSecure() {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      return true;
    }

    const cors = this.configService
      .get<string>('CORS_ORIGIN', '')
      .trim()
      .toLowerCase();

    return cors.startsWith('https://');
  }

  private isCrossSite() {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      return true;
    }

    const cors = this.configService
      .get<string>('CORS_ORIGIN', '')
      .trim()
      .toLowerCase();

    return cors.startsWith('https://');
  }
}
