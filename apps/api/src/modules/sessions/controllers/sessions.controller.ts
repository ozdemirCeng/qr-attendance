import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateSessionDto } from '../dto/create-session.dto';
import { SessionsService } from '../services/sessions.service';

@Controller('events/:eventId/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  create(@Param('eventId') eventId: string, @Body() payload: CreateSessionDto) {
    return this.sessionsService.create(eventId, payload);
  }

  @Get()
  list(@Param('eventId') eventId: string) {
    return this.sessionsService.list(eventId);
  }

  @Patch(':sessionId')
  update(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
    @Body() payload: Partial<CreateSessionDto>,
  ) {
    return this.sessionsService.update(eventId, sessionId, payload);
  }

  @Delete(':sessionId')
  remove(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.remove(eventId, sessionId);
  }
}
