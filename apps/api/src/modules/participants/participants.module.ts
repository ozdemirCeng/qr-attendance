import { Module } from '@nestjs/common';

import { ParticipantsController } from './controllers/participants.controller';
import { ParticipantsService } from './services/participants.service';

@Module({
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
})
export class ParticipantsModule {}
