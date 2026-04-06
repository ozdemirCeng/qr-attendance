import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateEventDto } from '../dto/create-event.dto';
import { EventsService } from '../services/events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  list() {
    return this.eventsService.list();
  }

  @Post()
  create(@Body() payload: CreateEventDto) {
    return this.eventsService.create(payload);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.eventsService.detail(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: Partial<CreateEventDto>) {
    return this.eventsService.update(id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
