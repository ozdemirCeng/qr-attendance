import {
  Body,
  Controller,
  Get,
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
import { LoginDto } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Audit({
    action: 'admin.login',
    entityType: 'auth',
    entityIdBody: 'email',
  })
  @Post('login')
  async login(
    @Body() payload: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.login(payload, req.headers.cookie);

    if (session.setCookieHeaders.length > 0) {
      res.setHeader('set-cookie', session.setCookieHeaders);
    }

    return {
      success: true,
    };
  }

  @Audit({
    action: 'admin.logout',
    entityType: 'auth',
  })
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout(req.headers.cookie);

    if (result.setCookieHeaders.length > 0) {
      res.setHeader('set-cookie', result.setCookieHeaders);
    }

    return {
      success: true,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser | undefined) {
    if (!user) {
      throw new UnauthorizedException('Oturum bulunamadi.');
    }
    return user;
  }
}
