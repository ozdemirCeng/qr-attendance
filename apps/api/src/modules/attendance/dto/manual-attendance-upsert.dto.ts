import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ManualAttendanceUpsertDto {
  @ApiProperty({ example: 'participant-id' })
  @IsString()
  participantId!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isValid!: boolean;

  @ApiPropertyOptional({
    description: 'Oturum id. Gonderilmezse aktif veya en son oturum secilir.',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ example: 'Manuel duzeltme ile yok yazildi.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
