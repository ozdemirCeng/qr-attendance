import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import {
  ParticipantLoginDto,
  ParticipantSignupDto,
} from '../dto/participant-auth.dto';
import {
  ChangePasswordDto,
  UpdateParticipantProfileDto,
} from '../dto/update-profile.dto';
import { ParticipantAuthService } from '../services/participant-auth.service';

@ApiTags('Participant Auth')
@Controller('participant-auth')
export class ParticipantAuthController {
  constructor(
    private readonly participantAuthService: ParticipantAuthService,
  ) {}

  @ApiOperation({ summary: 'Katilimci hesabi olusturur' })
  @ApiBody({ type: ParticipantSignupDto })
  @ApiOkResponse({ description: 'Hesap olusturuldu.' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('signup')
  async signup(
    @Body() payload: ParticipantSignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.participantAuthService.signup(payload);

    if (result.setCookieHeaders.length > 0) {
      res.setHeader('set-cookie', result.setCookieHeaders);
    }

    return { success: true, data: result.data };
  }

  @ApiOperation({ summary: 'Katilimci giris yapar' })
  @ApiBody({ type: ParticipantLoginDto })
  @ApiOkResponse({ description: 'Giris basarili.' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() payload: ParticipantLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.participantAuthService.login(payload);

    if (result.setCookieHeaders.length > 0) {
      res.setHeader('set-cookie', result.setCookieHeaders);
    }

    return { success: true, data: result.data };
  }

  @ApiOperation({ summary: 'Katilimci oturumunu getirir' })
  @ApiOkResponse({ description: 'Oturum bilgisi donuldu.' })
  @Get('me')
  me(@Req() req: Request) {
    const session = this.participantAuthService.resolveSessionFromCookie(
      req.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException('Oturum bulunamadi.');
    }

    return {
      id: session.id,
      name: session.name,
      email: session.email,
      phone: session.phone,
    };
  }

  @ApiOperation({ summary: 'Katilimci profilini gunceller' })
  @ApiBody({ type: UpdateParticipantProfileDto })
  @ApiOkResponse({ description: 'Profil guncellendi.' })
  @Patch('profile')
  async updateProfile(
    @Body() payload: UpdateParticipantProfileDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = this.participantAuthService.resolveSessionFromCookie(
      req.headers.cookie,
    );
    if (!session) {
      throw new UnauthorizedException('Oturum bulunamadi.');
    }

    const result = await this.participantAuthService.updateProfile(
      session.id,
      payload,
    );

    if (result.setCookieHeaders.length > 0) {
      res.setHeader('set-cookie', result.setCookieHeaders);
    }

    return { success: true, data: result.data };
  }

  @ApiOperation({ summary: 'Katilimci sifresini degistirir' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Sifre degistirildi.' })
  @Post('change-password')
  async changePassword(
    @Body() payload: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const session = this.participantAuthService.resolveSessionFromCookie(
      req.headers.cookie,
    );
    if (!session) {
      throw new UnauthorizedException('Oturum bulunamadi.');
    }

    return this.participantAuthService.changePassword(session.id, payload);
  }

  @ApiOperation({ summary: 'Katilimci cikis yapar' })
  @ApiOkResponse({ description: 'Cikis basarili.' })
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const headers = this.participantAuthService.createLogoutHeaders();
    if (headers.length > 0) {
      res.setHeader('set-cookie', headers);
    }
    return { success: true };
  }
}
