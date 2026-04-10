import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuditService } from '../services/audit.service';

@ApiTags('Audit')
@ApiCookieAuth('session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({ summary: 'Son audit kayitlarini listeler' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Audit kayitlari donuldu.' })
  @Get()
  async list(@Query('limit') limit?: string) {
    const parsedLimit = Number.parseInt(limit ?? '100', 10);

    return {
      success: true,
      data: await this.auditService.listLatest(
        Number.isNaN(parsedLimit) ? 100 : parsedLimit,
      ),
    };
  }
}
