import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListAttendanceQueryDto } from '../dto/list-attendance-query.dto';
import { AttendanceService } from '../services/attendance.service';

@ApiTags('Attendance')
@ApiCookieAuth('session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('events/:eventId/attendance')
export class AttendanceEventsController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @ApiOperation({ summary: 'Etkinlige ait katilim kayitlarini listeler' })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isValid', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Katilim listesi donuldu.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Get()
  list(
    @Param('eventId') eventId: string,
    @Query() query: ListAttendanceQueryDto,
  ) {
    return this.attendanceService.listByEvent(eventId, query);
  }

  @ApiOperation({ summary: 'Etkinlik katilim istatistiklerini getirir' })
  @ApiOkResponse({ description: 'Katilim istatistikleri donuldu.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Get('stats')
  stats(@Param('eventId') eventId: string) {
    return this.attendanceService.statsByEvent(eventId);
  }
}
