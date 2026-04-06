import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ExportQueueModule } from './queues/export/export-queue.module';
import { ImportQueueModule } from './queues/import/import-queue.module';

function getRedisConnection() {
  const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379');

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || '6379'),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    ExportQueueModule,
    ImportQueueModule,
  ],
})
export class AppModule {}
