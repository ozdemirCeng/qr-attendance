import { Module } from '@nestjs/common';

import { EventsModule } from '../events/events.module';
import { ParticipantsModule } from '../participants/participants.module';
import { QrModule } from '../qr/qr.module';
import { SessionsModule } from '../sessions/sessions.module';
import { AttendanceEventsController } from './controllers/attendance-events.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { AttendanceAttemptsRepository } from './repositories/attendance-attempts.repository';
import { AttendanceRecordsRepository } from './repositories/attendance-records.repository';
import { AttendanceService } from './services/attendance.service';

@Module({
  imports: [QrModule, SessionsModule, EventsModule, ParticipantsModule],
  controllers: [AttendanceController, AttendanceEventsController],
  providers: [
    AttendanceService,
    AttendanceRecordsRepository,
    AttendanceAttemptsRepository,
  ],
})
export class AttendanceModule {}
