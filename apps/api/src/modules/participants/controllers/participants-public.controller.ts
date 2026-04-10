import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SelfRegisterParticipantDto } from '../dto/self-register-participant.dto';
import { ParticipantsService } from '../services/participants.service';

@ApiTags('Participants (Public)')
@Controller('participants')
export class ParticipantsPublicController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @ApiOperation({
    summary: 'Katilimci etkinlige kendini kaydeder (public, auth gerekmez)',
  })
  @ApiBody({ type: SelfRegisterParticipantDto })
  @ApiOkResponse({ description: 'Kayit basarili.' })
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @Post('self-register')
  async selfRegister(@Body() payload: SelfRegisterParticipantDto) {
    return this.participantsService.selfRegister(payload);
  }
}
