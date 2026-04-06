import { Injectable } from '@nestjs/common';

import { CreateParticipantDto } from '../dto/create-participant.dto';

@Injectable()
export class ParticipantsService {
  createManual(eventId: string, payload: CreateParticipantDto) {
    return { success: true, data: { eventId, ...payload } };
  }

  list(eventId: string) {
    return { success: true, data: [], eventId };
  }

  remove(eventId: string, participantId: string) {
    return { success: true, eventId, participantId };
  }
}
