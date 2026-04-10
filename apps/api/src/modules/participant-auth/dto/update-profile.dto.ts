import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateParticipantProfileDto {
  @ApiPropertyOptional({ example: 'Ayse Yilmaz Demir', maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'ayse.new@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+905559998877', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ maxLength: 600000 })
  @IsString()
  @MaxLength(600000)
  @IsOptional()
  avatarDataUrl?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional({ example: 'EskiSifre123' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  currentPassword!: string;

  @ApiPropertyOptional({ example: 'YeniSifre456!' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword!: string;
}
