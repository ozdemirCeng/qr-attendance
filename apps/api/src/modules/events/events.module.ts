import { Module } from '@nestjs/common';

import { EventsController } from './controllers/events.controller';
import { EventsRepository } from './repositories/events.repository';
import { EventsService } from './services/events.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsRepository],
})
export class EventsModule {}
