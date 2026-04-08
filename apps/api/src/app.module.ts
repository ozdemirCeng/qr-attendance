import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { validateEnv } from './config/env.validation';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { ExportsModule } from './modules/exports/exports.module';
import { HealthModule } from './modules/health/health.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { QrModule } from './modules/qr/qr.module';
import { SessionsModule } from './modules/sessions/sessions.module';

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
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    BullModule.forRoot({
      connection: getRedisConnection(),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    HealthModule,
    AuthModule,
    EventsModule,
    SessionsModule,
    ParticipantsModule,
    QrModule,
    AttendanceModule,
    ExportsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
