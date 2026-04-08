import { Module } from '@nestjs/common';

import { EventsModule } from '../events/events.module';
import { SessionsController } from './controllers/sessions.controller';
import { SessionsRepository } from './repositories/sessions.repository';
import { SessionsService } from './services/sessions.service';

@Module({
  imports: [EventsModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
  exports: [SessionsRepository],
})
export class SessionsModule {}
