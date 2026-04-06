import { Module } from '@nestjs/common';

import { ExportsController } from './controllers/exports.controller';
import { ExportsService } from './services/exports.service';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
