import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { ScanAttendanceDto } from '../dto/scan-attendance.dto';
import { AttendanceService } from '../services/attendance.service';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @ApiOperation({ summary: 'QR token ile katilim kaydi olusturur' })
  @ApiBody({ type: ScanAttendanceDto })
  @ApiOkResponse({ description: 'Scan istegi isleme alindi.' })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('scan')
  scan(@Body() payload: ScanAttendanceDto, @Req() request: Request) {
    return this.attendanceService.scan(payload, {
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });
  }
}
