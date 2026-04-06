import { Injectable } from '@nestjs/common';

import { CreateEventDto } from '../dto/create-event.dto';

@Injectable()
export class EventsService {
  list() {
    return { success: true, data: [] };
  }

  create(payload: CreateEventDto) {
    return { success: true, data: payload };
  }

  detail(id: string) {
    return { success: true, data: { id } };
  }

  update(id: string, payload: Partial<CreateEventDto>) {
    return { success: true, data: { id, ...payload } };
  }

  remove(id: string) {
    return { success: true, id };
  }
}
