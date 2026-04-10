import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { SessionsService } from '../services/sessions.service';

@ApiTags('Sessions')
@ApiCookieAuth('session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('events/:eventId/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @ApiOperation({ summary: 'Etkinlige yeni oturum ekler' })
  @ApiOkResponse({ description: 'Oturum olusturuldu.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Post()
  async create(
    @Param('eventId') eventId: string,
    @Body() payload: CreateSessionDto,
  ) {
    return this.sessionsService.create(eventId, payload);
  }

  @ApiOperation({ summary: 'Etkinlige ait oturumlari listeler' })
  @ApiOkResponse({ description: 'Oturum listesi donuldu.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Get()
  async list(@Param('eventId') eventId: string) {
    return this.sessionsService.list(eventId);
  }

  @ApiOperation({ summary: 'Oturum bilgisini gunceller' })
  @ApiOkResponse({ description: 'Oturum guncellendi.' })
  @ApiNotFoundResponse({ description: 'Etkinlik veya oturum bulunamadi.' })
  @Patch(':sessionId')
  async update(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
    @Body() payload: UpdateSessionDto,
  ) {
    return this.sessionsService.update(eventId, sessionId, payload);
  }

  @ApiOperation({ summary: 'Oturumu siler' })
  @ApiOkResponse({ description: 'Oturum silindi.' })
  @ApiNotFoundResponse({ description: 'Etkinlik veya oturum bulunamadi.' })
  @Roles('admin')
  @Delete(':sessionId')
  async remove(
    @Param('eventId') eventId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.remove(eventId, sessionId);
  }
}
