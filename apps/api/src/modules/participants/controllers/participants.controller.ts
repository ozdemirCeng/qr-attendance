import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
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
import { CreateParticipantDto } from '../dto/create-participant.dto';
import { ListParticipantsQueryDto } from '../dto/list-participants-query.dto';
import { UploadedCsvFile } from '../participants.types';
import { ParticipantsService } from '../services/participants.service';

@ApiTags('Participants')
@ApiCookieAuth('session')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
@Controller('events/:eventId/participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @ApiOperation({ summary: 'Etkinlige manuel katilimci ekler' })
  @ApiOkResponse({ description: 'Katilimci olusturuldu.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Post('manual')
  createManual(
    @Param('eventId') eventId: string,
    @Body() payload: CreateParticipantDto,
  ) {
    return this.participantsService.createManual(eventId, payload);
  }

  @ApiOperation({ summary: 'Etkinlige ait katilimcilari listeler' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ description: 'Katilimci listesi donuldu.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Get()
  list(
    @Param('eventId') eventId: string,
    @Query() query: ListParticipantsQueryDto,
  ) {
    return this.participantsService.list(eventId, query);
  }

  @ApiOperation({ summary: 'CSV dosyasindan toplu katilimci import eder' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOkResponse({ description: 'CSV import sonucu donuldu.' })
  @ApiNotFoundResponse({ description: 'Etkinlik bulunamadi.' })
  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @Param('eventId') eventId: string,
    @UploadedFile() file: UploadedCsvFile | undefined,
  ) {
    return this.participantsService.importCsv(eventId, file);
  }

  @ApiOperation({ summary: 'Katilimciyi siler' })
  @ApiOkResponse({ description: 'Katilimci silindi.' })
  @ApiNotFoundResponse({ description: 'Etkinlik veya katilimci bulunamadi.' })
  @Roles('admin')
  @Delete(':participantId')
  remove(
    @Param('eventId') eventId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.participantsService.remove(eventId, participantId);
  }
}
