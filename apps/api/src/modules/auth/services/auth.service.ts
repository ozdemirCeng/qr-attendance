import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { RequestUser } from '../../../common/types/request-user.type';
import { LoginDto } from '../dto/login.dto';

type NeonAuthSessionResponse = {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  };
};

type NeonAuthProxyResult<T> = {
  data: T;
  setCookieHeaders: string[];
};

type LocalSessionPayload = {
  kind: 'local-demo';
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  exp: number;
};

@Injectable()
export class AuthService {
  private readonly neonAuthBaseUrl: string;
  private readonly localSessionSecret: string;
  private readonly demoAdminEmail: string;
  private readonly demoAdminUsername: string;
  private readonly demoAdminPassword: string;
  private readonly demoAdminName: string;
  private readonly localSessionTtlSeconds = 60 * 60 * 24;

  constructor(private readonly configService: ConfigService) {
    this.neonAuthBaseUrl = this.configService.get<string>(
      'NEON_AUTH_BASE_URL',
      '',
    );
    this.localSessionSecret = this.configService
      .get<string>('QR_SECRET', '')
      .trim();
    this.demoAdminEmail = this.configService
      .get<string>('DEMO_ADMIN_EMAIL', 'demo.admin@qrattendance.local')
      .trim()
      .toLowerCase();
    const configuredDemoUsername = this.configService
      .get<string>('DEMO_ADMIN_USERNAME', '')
      .trim()
      .toLowerCase();
    const fallbackDemoUsername =
      this.demoAdminEmail.split('@')[0]?.trim().toLowerCase() || 'demoadmin';
    this.demoAdminUsername = configuredDemoUsername || fallbackDemoUsername;
    this.demoAdminPassword = this.configService
      .get<string>('DEMO_ADMIN_PASSWORD', 'DemoAdmin123!')
      .trim();
    this.demoAdminName = this.configService
      .get<string>('DEMO_ADMIN_NAME', 'Demo Admin')
      .trim();
  }

  async login(payload: LoginDto, cookieHeader?: string) {
    const normalizedIdentifier = this.resolveIdentifier(payload);

    if (this.isLocalDemoCredential(normalizedIdentifier, payload.password)) {
      const token = this.createLocalSessionToken({
        kind: 'local-demo',
        id: 'demo-admin',
        email: this.demoAdminEmail,
        name: this.demoAdminName,
        role: 'admin',
        exp: Date.now() + this.localSessionTtlSeconds * 1000,
      });

      return {
        success: true,
        setCookieHeaders: [this.createSessionCookieHeader(token)],
      };
    }

    if (!this.neonAuthBaseUrl) {
      throw new UnauthorizedException('Giris bilgileri gecersiz.');
    }

    const normalizedEmail = this.resolveEmailForNeon(normalizedIdentifier);

    if (!normalizedEmail) {
      throw new UnauthorizedException('Giris bilgileri gecersiz.');
    }

    const result = await this.callNeonAuth<unknown>('/sign-in/email', {
      method: 'POST',
      cookieHeader,
      body: {
        email: normalizedEmail,
        password: payload.password,
      },
    });

    return {
      success: true,
      setCookieHeaders: result.setCookieHeaders,
    };
  }

  async logout(cookieHeader?: string) {
    const localSession = this.resolveLocalSessionFromCookie(cookieHeader);

    if (localSession) {
      return {
        success: true,
        setCookieHeaders: [this.createClearSessionCookieHeader()],
      };
    }

    if (!this.neonAuthBaseUrl) {
      return {
        success: true,
        setCookieHeaders: [this.createClearSessionCookieHeader()],
      };
    }

    const result = await this.callNeonAuth<unknown>('/sign-out', {
      method: 'POST',
      cookieHeader,
    });

    return {
      success: true,
      setCookieHeaders: result.setCookieHeaders,
    };
  }

  async updateProfile(
    cookieHeader: string | undefined,
    payload: { name?: string; email?: string },
  ) {
    const localSession = this.resolveLocalSessionFromCookie(cookieHeader);

    if (!localSession) {
      throw new BadRequestException(
        'Bu admin hesabi icin profil duzenleme desteklenmiyor.',
      );
    }

    const nextName = payload.name?.trim() || localSession.name;
    const nextEmail = payload.email?.trim().toLowerCase() || localSession.email;
    const token = this.createLocalSessionToken({
      ...localSession,
      name: nextName,
      email: nextEmail,
      exp: Date.now() + this.localSessionTtlSeconds * 1000,
    });

    return {
      success: true,
      data: {
        id: localSession.id,
        role: localSession.role,
        name: nextName,
        email: nextEmail,
      },
      setCookieHeaders: [this.createSessionCookieHeader(token)],
    };
  }

  async resolveUserFromSession(cookieHeader?: string): Promise<RequestUser> {
    if (!cookieHeader) {
      throw new UnauthorizedException('Oturum bulunamadi.');
    }

    const localSession = this.resolveLocalSessionFromCookie(cookieHeader);
    if (localSession) {
      return {
        id: localSession.id,
        email: localSession.email,
        name: localSession.name,
        role: localSession.role,
      };
    }

    if (!this.neonAuthBaseUrl) {
      throw new UnauthorizedException('Oturum bulunamadi.');
    }

    const result = await this.callNeonAuth<NeonAuthSessionResponse>(
      '/get-session',
      {
        method: 'GET',
        cookieHeader,
      },
    );

    const responseData = result.data;
    const neonUser =
      responseData && typeof responseData === 'object'
        ? (responseData as NeonAuthSessionResponse).user
        : undefined;

    if (
      !neonUser ||
      typeof neonUser.id !== 'string' ||
      typeof neonUser.email !== 'string'
    ) {
      throw new UnauthorizedException('Oturum bulunamadi.');
    }

    return {
      id: neonUser.id,
      email: neonUser.email,
      name: typeof neonUser.name === 'string' ? neonUser.name : 'Admin',
      role: neonUser.role === 'editor' ? 'editor' : 'admin',
    };
  }

  getSessionCookieName() {
    return this.configService.get<string>('AUTH_COOKIE_NAME', 'session');
  }

  createLogoutHeaders() {
    return [this.createClearSessionCookieHeader()];
  }

  private resolveIdentifier(payload: LoginDto) {
    if (typeof payload.identifier === 'string' && payload.identifier.trim()) {
      return payload.identifier.trim().toLowerCase();
    }

    if (typeof payload.email === 'string' && payload.email.trim()) {
      return payload.email.trim().toLowerCase();
    }

    return '';
  }

  private resolveEmailForNeon(identifier: string) {
    if (!identifier) {
      return null;
    }

    if (identifier.includes('@')) {
      return identifier;
    }

    if (identifier === this.demoAdminUsername) {
      return this.demoAdminEmail;
    }

    return null;
  }

  private isLocalDemoCredential(identifier: string, password: string) {
    const normalizedPassword = password.trim();

    if (normalizedPassword !== this.demoAdminPassword) {
      return false;
    }

    return (
      identifier === this.demoAdminEmail ||
      identifier === this.demoAdminUsername
    );
  }

  private createSessionCookieHeader(token: string) {
    const cookieName = this.getSessionCookieName();
    const secure = this.shouldUseSecureCookies() ? '; Secure' : '';
    const sameSite = this.shouldUseCrossSiteCookiePolicy() ? 'None' : 'Lax';

    return `${cookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${this.localSessionTtlSeconds}${secure}`;
  }

  private createClearSessionCookieHeader() {
    const cookieName = this.getSessionCookieName();
    const secure = this.shouldUseSecureCookies() ? '; Secure' : '';
    const sameSite = this.shouldUseCrossSiteCookiePolicy() ? 'None' : 'Lax';

    return `${cookieName}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${secure}`;
  }

  private shouldUseSecureCookies() {
    if (this.isProductionEnvironment()) {
      return true;
    }

    const corsOrigin = this.configService
      .get<string>('CORS_ORIGIN', '')
      .trim()
      .toLowerCase();

    return corsOrigin.startsWith('https://');
  }

  private shouldUseCrossSiteCookiePolicy() {
    if (this.isProductionEnvironment()) {
      return true;
    }

    const corsOrigin = this.configService
      .get<string>('CORS_ORIGIN', '')
      .trim()
      .toLowerCase();

    return corsOrigin.startsWith('https://');
  }

  private isProductionEnvironment() {
    return (
      this.configService.get<string>('NODE_ENV', 'development') === 'production'
    );
  }

  private createLocalSessionToken(payload: LocalSessionPayload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.signValue(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  private resolveLocalSessionFromCookie(cookieHeader?: string) {
    if (!cookieHeader) {
      return null;
    }

    const token = this.getCookieValue(
      cookieHeader,
      this.getSessionCookieName(),
    );
    if (!token || !token.includes('.')) {
      return null;
    }

    const [encodedPayload, providedSignature] = token.split('.', 2);
    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const expectedSignature = this.signValue(encodedPayload);
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }

    try {
      const decoded = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const payload = JSON.parse(decoded) as LocalSessionPayload;

      if (
        payload.kind !== 'local-demo' ||
        typeof payload.id !== 'string' ||
        typeof payload.email !== 'string' ||
        typeof payload.name !== 'string' ||
        (payload.role !== 'admin' && payload.role !== 'editor') ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }

      if (payload.exp <= Date.now()) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  private getCookieValue(cookieHeader: string, cookieName: string) {
    const cookies = cookieHeader.split(';');

    for (const cookie of cookies) {
      const [rawKey, ...rawValueParts] = cookie.trim().split('=');

      if (rawKey !== cookieName) {
        continue;
      }

      const rawValue = rawValueParts.join('=');

      try {
        return decodeURIComponent(rawValue);
      } catch {
        return rawValue;
      }
    }

    return null;
  }

  private signValue(value: string) {
    return createHmac('sha256', this.localSessionSecret)
      .update(value)
      .digest('base64url');
  }

  private async callNeonAuth<T>(
    path: string,
    options: {
      method: 'GET' | 'POST';
      cookieHeader?: string;
      body?: unknown;
    },
  ): Promise<NeonAuthProxyResult<T>> {
    if (!this.neonAuthBaseUrl) {
      throw new InternalServerErrorException(
        'NEON_AUTH_BASE_URL tanimli degil.',
      );
    }

    let response: Response;

    try {
      response = await fetch(`${this.neonAuthBaseUrl}${path}`, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...(options.cookieHeader ? { Cookie: options.cookieHeader } : {}),
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      throw new UnauthorizedException('Kimlik dogrulama servisine ulasilamadi.');
    }

    const setCookieHeaders = this.extractSetCookieHeaders(response);
    const payload: unknown = await response.json().catch(() => ({}));
    const payloadObject =
      payload && typeof payload === 'object'
        ? (payload as { message?: unknown })
        : null;

    if (!response.ok) {
      const message =
        typeof payloadObject?.message === 'string' &&
        payloadObject.message.trim()
          ? payloadObject.message
          : 'Kimlik dogrulama hatasi.';

      throw new UnauthorizedException(
        message,
      );
    }

    return {
      data: payload as T,
      setCookieHeaders,
    };
  }

  private extractSetCookieHeaders(response: Response): string[] {
    const headers = response.headers as Headers & {
      getSetCookie?: () => string[];
    };

    if (typeof headers.getSetCookie === 'function') {
      return headers.getSetCookie();
    }

    const singleHeader = response.headers.get('set-cookie');
    return singleHeader ? [singleHeader] : [];
  }
}
