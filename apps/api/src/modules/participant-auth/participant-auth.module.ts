import { Module } from '@nestjs/common';

import { ParticipantAuthController } from './controllers/participant-auth.controller';
import { ParticipantUsersRepository } from './repositories/participant-users.repository';
import { ParticipantAuthService } from './services/participant-auth.service';

@Module({
  controllers: [ParticipantAuthController],
  providers: [ParticipantAuthService, ParticipantUsersRepository],
  exports: [ParticipantAuthService],
})
export class ParticipantAuthModule {}
