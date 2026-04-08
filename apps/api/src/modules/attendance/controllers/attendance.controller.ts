import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { Audit } from '../../../common/decorators/audit.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ScanAttendanceDto } from '../dto/scan-attendance.dto';
import { UpdateManualStatusDto } from '../dto/update-manual-status.dto';
import { AttendanceService } from '../services/attendance.service';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @ApiOperation({ summary: 'QR token ile katilim kaydi olusturur' })
  @ApiBody({ type: ScanAttendanceDto })
  @ApiOkResponse({ description: 'Scan istegi isleme alindi.' })
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @Post('scan')
  scan(@Body() payload: ScanAttendanceDto, @Req() request: Request) {
    return this.attendanceService.scan(payload, {
      ip: request.ip ?? null,
      userAgent: request.headers['user-agent'] ?? null,
    });
  }

  @ApiOperation({
    summary: 'Katilim kaydinin manuel gecerlilik durumunu gunceller',
  })
  @ApiCookieAuth('session')
  @ApiBody({ type: UpdateManualStatusDto })
  @ApiOkResponse({ description: 'Katilim kaydi guncellendi.' })
  @ApiNotFoundResponse({ description: 'Katilim kaydi bulunamadi.' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Audit({
    action: 'attendance.manual_override',
    entityType: 'attendance',
    entityIdParam: 'id',
  })
  @Patch(':id/manual-status')
  updateManualStatus(
    @Param('id') id: string,
    @Body() payload: UpdateManualStatusDto,
  ) {
    return this.attendanceService.updateManualStatus(id, payload);
  }
}
