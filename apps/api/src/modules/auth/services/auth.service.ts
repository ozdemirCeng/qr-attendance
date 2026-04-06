import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class AuthService {
  private readonly neonAuthBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.neonAuthBaseUrl = this.configService.get<string>(
      'NEON_AUTH_BASE_URL',
      '',
    );
  }

  async login(payload: LoginDto, cookieHeader?: string) {
    const result = await this.callNeonAuth<unknown>('/sign-in/email', {
      method: 'POST',
      cookieHeader,
      body: {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      },
    });

    return {
      success: true,
      setCookieHeaders: result.setCookieHeaders,
    };
  }

  async logout(cookieHeader?: string) {
    const result = await this.callNeonAuth<unknown>('/sign-out', {
      method: 'POST',
      cookieHeader,
    });

    return {
      success: true,
      setCookieHeaders: result.setCookieHeaders,
    };
  }

  async resolveUserFromSession(cookieHeader?: string): Promise<RequestUser> {
    if (!cookieHeader) {
      throw new UnauthorizedException('Oturum bulunamadi.');
    }

    const result = await this.callNeonAuth<NeonAuthSessionResponse>(
      '/get-session',
      {
        method: 'GET',
        cookieHeader,
      },
    );

    const neonUser = result.data.user;

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

    const response = await fetch(`${this.neonAuthBaseUrl}${path}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.cookieHeader ? { Cookie: options.cookieHeader } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const setCookieHeaders = this.extractSetCookieHeaders(response);
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };

    if (!response.ok) {
      throw new UnauthorizedException(
        payload.message ?? 'Kimlik dogrulama hatasi.',
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
