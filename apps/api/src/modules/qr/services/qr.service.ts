import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EventsRepository } from '../../events/repositories/events.repository';
import { SessionsRepository } from '../../sessions/repositories/sessions.repository';
import { QrTokenService } from './qr-token.service';

@Injectable()
export class QrService {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventsRepository: EventsRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly qrTokenService: QrTokenService,
  ) {}

  getCurrentToken(eventId: string) {
    this.ensureEventExists(eventId);

    const activeSession = this.sessionsRepository.findActiveByEventId(eventId);
    if (!activeSession) {
      throw new NotFoundException('Aktif oturum bulunamadi.');
    }

    const rotationSeconds = this.configService.get<number>(
      'QR_ROTATION_SECONDS',
      60,
    );
    const token = this.qrTokenService.generateToken(
      activeSession.id,
      rotationSeconds,
    );

    return {
      success: true,
      data: {
        token,
        expiresIn: this.qrTokenService.getExpiresIn(rotationSeconds),
        sessionId: activeSession.id,
      },
    };
  }

  private ensureEventExists(eventId: string) {
    const event = this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }
  }
}
