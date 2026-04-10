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

  async getCurrentToken(eventId: string) {
    await this.ensureEventExists(eventId);

    const activeSession =
      await this.sessionsRepository.findActiveByEventId(eventId);
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
    const verificationCode = this.qrTokenService.generateSessionVerificationCode(
      activeSession.id,
      rotationSeconds,
    );
    await this.qrTokenService.registerVerificationCode(
      verificationCode,
      token,
      rotationSeconds * 3,
    );

    return {
      success: true,
      data: {
        token,
        verificationCode,
        expiresIn: this.qrTokenService.getExpiresIn(rotationSeconds),
        sessionId: activeSession.id,
      },
    };
  }

  private async ensureEventExists(eventId: string) {
    const event = await this.eventsRepository.findById(eventId);

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadi.');
    }
  }
}
