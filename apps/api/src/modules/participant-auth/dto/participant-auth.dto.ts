import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsEmail,
} from 'class-validator';

export class ParticipantSignupDto {
  @ApiProperty({ example: 'Ayse Yilmaz', maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'ayse@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '+905551112233', maxLength: 32 })
  @IsString()
  @MaxLength(32)
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Sifre123!', minLength: 6, maxLength: 128 })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}

export class ParticipantLoginDto {
  @ApiProperty({ example: 'ayse@example.com veya 05551112233' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  identifier!: string;

  @ApiPropertyOptional({ example: 'ayse@example.com' })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Sifre123!' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;
}
