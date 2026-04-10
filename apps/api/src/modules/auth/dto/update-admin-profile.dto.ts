import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAdminProfileDto {
  @ApiPropertyOptional({ example: 'Demo Admin', maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'demo.admin@qrattendance.local', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  email?: string;
}
