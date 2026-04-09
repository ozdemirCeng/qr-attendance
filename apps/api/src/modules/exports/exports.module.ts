import { Module } from '@nestjs/common';

import { AttendanceModule } from '../attendance/attendance.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { ParticipantsModule } from '../participants/participants.module';
import { ExportsController } from './controllers/exports.controller';
import { ExportsService } from './services/exports.service';

@Module({
  imports: [AuthModule, EventsModule, AttendanceModule, ParticipantsModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
