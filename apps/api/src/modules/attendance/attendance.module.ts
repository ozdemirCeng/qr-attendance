import { Module } from '@nestjs/common';

import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceService } from './services/attendance.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
