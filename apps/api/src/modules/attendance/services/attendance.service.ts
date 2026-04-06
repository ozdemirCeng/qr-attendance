import { Injectable } from '@nestjs/common';

import { ScanAttendanceDto } from '../dto/scan-attendance.dto';

@Injectable()
export class AttendanceService {
  scan(payload: ScanAttendanceDto) {
    return {
      success: true,
      action: 'CHECKED_IN',
      payload,
    };
  }
}
