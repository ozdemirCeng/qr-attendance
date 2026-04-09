import { Controller, Get } from '@nestjs/common';

import { HealthService } from '../services/health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  check() {
    return this.healthService.check();
  }

  @Get()
  root() {
    return this.healthService.check();
  }
}
