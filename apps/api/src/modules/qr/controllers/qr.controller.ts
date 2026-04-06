import { Controller, Get, Param } from '@nestjs/common';

import { QrService } from '../services/qr.service';

@Controller('events/:eventId/qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('current')
  current(@Param('eventId') eventId: string) {
    return this.qrService.getCurrentToken(eventId);
  }
}
