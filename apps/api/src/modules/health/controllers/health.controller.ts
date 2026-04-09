import { Controller, Get, Redirect } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HealthService } from '../services/health.service';

@Controller()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('health')
  check() {
    return this.healthService.check();
  }

  @Get()
  @Redirect()
  root() {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN');
    const redirectTarget = corsOrigin
      ?.split(',')
      .map((origin) => origin.trim())
      .find((origin) => origin.length > 0);

    return {
      statusCode: 302,
      url: redirectTarget ?? '/health',
    };
  }
}
