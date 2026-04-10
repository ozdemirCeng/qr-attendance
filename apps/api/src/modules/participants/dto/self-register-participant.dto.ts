import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SelfRegisterParticipantDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Etkinlik ID',
  })
  @IsUUID()
  eventId!: string;

  @ApiProperty({
    example: 'Ayşe Yılmaz',
    maxLength: 160,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    example: 'ayse@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: '+905551112233',
    maxLength: 32,
  })
  @IsString()
  @MaxLength(32)
  @IsOptional()
  phone?: string;
}
