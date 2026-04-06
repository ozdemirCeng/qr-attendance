import { Injectable } from '@nestjs/common';

import { CreateSessionDto } from '../dto/create-session.dto';

@Injectable()
export class SessionsService {
  create(eventId: string, payload: CreateSessionDto) {
    return { success: true, data: { eventId, ...payload } };
  }

  list(eventId: string) {
    return { success: true, data: [], eventId };
  }

  update(
    eventId: string,
    sessionId: string,
    payload: Partial<CreateSessionDto>,
  ) {
    return { success: true, data: { eventId, sessionId, ...payload } };
  }

  remove(eventId: string, sessionId: string) {
    return { success: true, eventId, sessionId };
  }
}
