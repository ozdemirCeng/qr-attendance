import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { Audit } from '../../../common/decorators/audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RequestUser } from '../../../common/types/request-user.type';
import { ParticipantAuthService } from '../../participant-auth/services/participant-auth.service';
import { LoginDto } from '../dto/login.dto';
import { UpdateAdminProfileDto } from '../dto/update-admin-profile.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly participantAuthService: ParticipantAuthService,
  ) {}

  @Audit({
    action: 'auth.login',
    entityType: 'auth',
    entityIdBody: 'identifier',
  })
  @Post('login')
  async login(
    @Body() payload: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const session = await this.authService.login(payload, req.headers.cookie);
      const headers = [
        ...this.participantAuthService.createLogoutHeaders(),
        ...session.setCookieHeaders,
      ];

      if (headers.length > 0) {
        res.setHeader('set-cookie', headers);
      }

      return { success: true };
    } catch (adminError) {
      const identifier =
        payload.identifier?.trim().toLowerCase() ??
        payload.email?.trim().toLowerCase() ??
        '';

      if (!identifier.includes('@')) {
        throw adminError;
      }

      const participantSession = await this.participantAuthService.login({
        email: identifier,
        password: payload.password,
      });
      const headers = [
        ...this.authService.createLogoutHeaders(),
        ...participantSession.setCookieHeaders,
      ];

      if (headers.length > 0) {
        res.setHeader('set-cookie', headers);
      }

      return { success: true };
    }
  }

  @Audit({
    action: 'admin.logout',
    entityType: 'auth',
  })
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(req.headers.cookie);
    const headers = [
      ...result.setCookieHeaders,
      ...this.participantAuthService.createLogoutHeaders(),
    ];

    if (headers.length > 0) {
      res.setHeader('set-cookie', headers);
    }

    return {
      success: true,
    };
  }

  @Get('active-session')
  async activeSession(@Req() req: Request) {
    try {
      const adminUser = await this.authService.resolveUserFromSession(
        req.headers.cookie,
      );

      return {
        success: true,
        data: {
          role: adminUser.role,
          dashboardPath: '/dashboard',
          user: adminUser,
        },
      };
    } catch {
      const participantSession =
        this.participantAuthService.resolveSessionFromCookie(req.headers.cookie);

      if (!participantSession) {
        throw new UnauthorizedException('Oturum bulunamadi.');
      }

      return {
        success: true,
        data: {
          role: 'member',
          dashboardPath: '/user/dashboard',
          user: {
            id: participantSession.id,
            name: participantSession.name,
            email: participantSession.email,
            phone: participantSession.phone,
            avatarDataUrl: participantSession.avatarDataUrl,
          },
        },
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser | undefined) {
    if (!user) {
      throw new UnauthorizedException('Oturum bulunamadi.');
    }
    return user;
  }

  @Patch('profile')
  async updateProfile(
    @Body() payload: UpdateAdminProfileDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.updateProfile(
      req.headers.cookie,
      payload,
    );

    if (result.setCookieHeaders.length > 0) {
      res.setHeader('set-cookie', result.setCookieHeaders);
    }

    return { success: true, data: result.data };
  }
}
