import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ExportProcessor } from './export.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'export.queue',
    }),
  ],
  providers: [ExportProcessor],
})
export class ExportQueueModule {}
