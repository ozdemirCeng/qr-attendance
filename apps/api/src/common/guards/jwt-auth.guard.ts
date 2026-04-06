import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { AuthService } from '../../modules/auth/services/auth.service';
import { RequestUser } from '../types/request-user.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { cookie?: string }; user?: RequestUser }>();
    request.user = await this.authService.resolveUserFromSession(
      request.headers.cookie,
    );

    return true;
  }
}
