import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { CreateEventDto } from '../dto/create-event.dto';
import { ListEventsQueryDto } from '../dto/list-events-query.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { EventsService } from '../services/events.service';

@ApiTags('Events')
@ApiCookieAuth('session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @ApiOperation({ summary: 'Etkinlikleri sayfali olarak listeler' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Etkinlik listesi donuldu.' })
  @Get()
  list(@Query() query: ListEventsQueryDto) {
    return this.eventsService.list(query);
  }

  @ApiOperation({ summary: 'Yeni etkinlik olusturur' })
  @ApiOkResponse({ description: 'Etkinlik olusturuldu.' })
  @Post()
  create(@Body() payload: CreateEventDto) {
    return this.eventsService.create(payload);
  }

  @ApiOperation({ summary: 'Etkinlik detayini getirir' })
  @ApiOkResponse({ description: 'Etkinlik detayi donuldu.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.eventsService.detail(id);
  }

  @ApiOperation({ summary: 'Etkinligi gunceller' })
  @ApiOkResponse({ description: 'Etkinlik guncellendi.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateEventDto) {
    return this.eventsService.update(id, payload);
  }

  @ApiOperation({ summary: 'Etkinligi soft delete olarak siler' })
  @ApiOkResponse({ description: 'Etkinlik silindi.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
