import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { ParticipantsController } from './controllers/participants.controller';
import { ParticipantsRepository } from './repositories/participants.repository';
import { ParticipantsService } from './services/participants.service';

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService, ParticipantsRepository],
  exports: [ParticipantsRepository],
})
export class ParticipantsModule {}
