import { Controller, Get, Param, Post } from '@nestjs/common';

import { ExportsService } from '../services/exports.service';

@Controller()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('events/:eventId/attendance/export')
  requestExport(@Param('eventId') eventId: string) {
    return this.exportsService.requestAttendanceExport(eventId);
  }

  @Get('exports/:id/status')
  status(@Param('id') exportId: string) {
    return this.exportsService.getStatus(exportId);
  }
}
