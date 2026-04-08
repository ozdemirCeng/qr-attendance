import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListParticipantsQueryDto {
  @ApiPropertyOptional({
    description: 'Sayfa numarasi (1 tabanli)',
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Sayfa basina kayit sayisi',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    description: 'Ad, e-posta veya telefon ile arama ifadesi',
    maxLength: 120,
  })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  search?: string;
}
