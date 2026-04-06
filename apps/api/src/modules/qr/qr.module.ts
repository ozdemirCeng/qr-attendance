import { Module } from '@nestjs/common';

import { QrController } from './controllers/qr.controller';
import { QrService } from './services/qr.service';

@Module({
  controllers: [QrController],
  providers: [QrService],
})
export class QrModule {}
