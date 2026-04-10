import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { QrService } from '../services/qr.service';

@ApiTags('QR')
@Controller('events/:eventId/qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @ApiOperation({ summary: 'Aktif oturum icin guncel QR tokeni getirir (admin)' })
  @ApiCookieAuth('session')
  @ApiOkResponse({ description: 'QR token basariyla donuldu.' })
  @ApiNotFoundResponse({
    description: 'Etkinlik veya aktif oturum bulunamadi.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'editor')
  @Get('current')
  async current(@Param('eventId') eventId: string) {
    return this.qrService.getCurrentToken(eventId);
  }

  @ApiOperation({ summary: 'Aktif oturum icin guncel QR tokeni getirir (public)' })
  @ApiOkResponse({ description: 'QR token basariyla donuldu.' })
  @ApiNotFoundResponse({
    description: 'Etkinlik veya aktif oturum bulunamadi.',
  })
  @Get('public')
  async publicToken(@Param('eventId') eventId: string) {
    return this.qrService.getCurrentToken(eventId);
  }
}

