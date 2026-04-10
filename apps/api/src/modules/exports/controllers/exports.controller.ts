import { Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { basename } from 'node:path';

import { Audit } from '../../../common/decorators/audit.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ExportsService } from '../services/exports.service';

@ApiTags('Exports')
@ApiCookieAuth('session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @ApiOperation({ summary: 'Etkinlik katilim export islemini baslatir' })
  @ApiOkResponse({ description: 'Export istegi alindi.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Audit({
    action: 'export.requested',
    entityType: 'export',
    entityIdResponsePath: 'data.exportId',
  })
  @Post('events/:eventId/attendance/export')
  async requestExport(@Param('eventId') eventId: string) {
    return this.exportsService.requestAttendanceExport(eventId);
  }

  @ApiOperation({ summary: 'Export durumunu getirir' })
  @ApiOkResponse({ description: 'Export durumu donuldu.' })
  @ApiNotFoundResponse({ description: 'Export kaydi bulunamadi.' })
  @Get('exports/:id/status')
  async status(@Param('id') exportId: string) {
    return this.exportsService.getStatus(exportId);
  }

  @ApiOperation({ summary: 'Hazir export dosyasini indirir' })
  @ApiOkResponse({ description: 'Export dosyasi indiriliyor.' })
  @ApiNotFoundResponse({ description: 'Export kaydi veya dosyasi bulunamadi.' })
  @Audit({
    action: 'export.completed',
    entityType: 'export',
    entityIdParam: 'id',
  })
  @Get('exports/:id/download')
  async download(@Param('id') exportId: string, @Res() response: Response) {
    const filePath = await this.exportsService.getDownloadFilePath(exportId);

    return response.download(filePath, basename(filePath));
  }
}
