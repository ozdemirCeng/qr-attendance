import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { EventsController } from './controllers/events.controller';
import { EventsRepository } from './repositories/events.repository';
import { EventsService } from './services/events.service';

@Module({
  imports: [AuthModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsRepository],
})
export class EventsModule {}
