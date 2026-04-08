import {
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EVENT_STATUSES, type EventStatus } from '../events.types';

export class CreateEventDto {
  @ApiProperty({
    example: 'Yazilim Muhendisligi Semineri',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    example: 'Dersin final tekrar oturumu.',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'A Blok Konferans Salonu' })
  @IsString()
  @MaxLength(160)
  locationName!: string;

  @ApiProperty({ example: 40.765123, minimum: -90, maximum: 90 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 29.940321, minimum: -180, maximum: 180 })
  @IsNumber()
  longitude!: number;

  @ApiProperty({ example: 100, minimum: 30 })
  @IsNumber()
  @Min(30)
  radiusMeters!: number;

  @ApiProperty({ example: '2026-04-15T09:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: '2026-04-15T11:00:00.000Z' })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({
    enum: EVENT_STATUSES,
    example: 'draft',
  })
  @IsOptional()
  @IsEnum(EVENT_STATUSES)
  status?: EventStatus;
}
