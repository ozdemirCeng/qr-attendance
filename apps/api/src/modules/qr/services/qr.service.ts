import { Injectable } from '@nestjs/common';

@Injectable()
export class QrService {
  getCurrentToken(eventId: string) {
    const tokenSuffix = Date.now().toString(36);

    return {
      success: true,
      eventId,
      token: `demo-${eventId}-${tokenSuffix}`,
      expiresIn: 60,
      sessionId: `session-${eventId}`,
    };
  }
}
