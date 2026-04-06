import { Body, Controller, Post } from '@nestjs/common';

import { ScanAttendanceDto } from '../dto/scan-attendance.dto';
import { AttendanceService } from '../services/attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('scan')
  scan(@Body() payload: ScanAttendanceDto) {
    return this.attendanceService.scan(payload);
  }
}
