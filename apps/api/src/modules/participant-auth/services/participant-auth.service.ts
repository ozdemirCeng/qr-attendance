import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { isDatabaseUniqueViolation } from '../../../common/database/neon';
import {
  ParticipantLoginDto,
  ParticipantSignupDto,
} from '../dto/participant-auth.dto';
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

@Injectable()
export class ParticipantAuthService {
  private readonly sessionSecret: string;
  private readonly sessionTtlSeconds = 60 * 60 * 24 * 7; // 7 days
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
      throw new BadRequestException(
        'Bu e-posta adresi zaten kayitli.',
      );
    }

    const passwordHash = await this.hashPassword(payload.password);

    try {
      const user = await this.usersRepository.create({
        name: payload.name.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
      });

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
        },
        setCookieHeaders: [this.createCookieHeader(token)],
      };
    } catch (error) {
      if (isDatabaseUniqueViolation(error)) {
        throw new BadRequestException(
          'Bu e-posta adresi zaten kayitli.',
        );
      }
      throw error;
    }
  }

  async login(payload: ParticipantLoginDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('E-posta veya sifre hatali.');
    }

    const isValid = await this.verifyPassword(
      payload.password,
      user.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('E-posta veya sifre hatali.');
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
      },
      setCookieHeaders: [this.createCookieHeader(token)],
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

      return payload;
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
    const encoded = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
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

  private isSecure() {
    if (this.configService.get<string>('NODE_ENV') === 'production')
      return true;
    const cors = this.configService
      .get<string>('CORS_ORIGIN', '')
      .trim()
      .toLowerCase();
    return cors.startsWith('https://');
  }

  private isCrossSite() {
    if (this.configService.get<string>('NODE_ENV') === 'production')
      return true;
    const cors = this.configService
      .get<string>('CORS_ORIGIN', '')
      .trim()
      .toLowerCase();
    return cors.startsWith('https://');
  }
}
