import { Module } from '@nestjs/common';

import { EventsModule } from '../events/events.module';
import { SessionsModule } from '../sessions/sessions.module';
import { QrController } from './controllers/qr.controller';
import { QrNonceStoreService } from './services/qr-nonce-store.service';
import { QrService } from './services/qr.service';
import { QrTokenService } from './services/qr-token.service';

@Module({
  imports: [EventsModule, SessionsModule],
  controllers: [QrController],
  providers: [QrService, QrTokenService, QrNonceStoreService],
  exports: [QrTokenService],
})
export class QrModule {}
