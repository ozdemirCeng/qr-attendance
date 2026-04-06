import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ImportProcessor } from './import.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'import.queue',
    }),
  ],
  providers: [ImportProcessor],
})
export class ImportQueueModule {}
