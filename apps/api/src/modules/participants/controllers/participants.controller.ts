import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

import { CreateParticipantDto } from '../dto/create-participant.dto';
import { ParticipantsService } from '../services/participants.service';

@Controller('events/:eventId/participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post('manual')
  createManual(
    @Param('eventId') eventId: string,
    @Body() payload: CreateParticipantDto,
  ) {
    return this.participantsService.createManual(eventId, payload);
  }

  @Get()
  list(@Param('eventId') eventId: string) {
    return this.participantsService.list(eventId);
  }

  @Delete(':participantId')
  remove(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.participantsService.remove(eventId, participantId);
  }
}
