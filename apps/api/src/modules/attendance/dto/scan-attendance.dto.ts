import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ScanAttendanceDto {
  @ApiProperty({
    example: 'eyJ2IjoxLCJzaWQiOiIuLi4ifQ',
    description: 'QR token degeri veya kisa dogrulama kodu',
  })
  @IsString()
  @MaxLength(4096)
  token!: string;

  @ApiPropertyOptional({ example: 40.7651 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiPropertyOptional({ example: 29.9403 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiPropertyOptional({ example: 35 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  locationAccuracy?: number;

  @ApiPropertyOptional({ example: 'Ayse Yilmaz', maxLength: 160 })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: 'ayse@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+905551112233', maxLength: 32 })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: 'device-hash-001', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fingerprint?: string;

  @ApiPropertyOptional({
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
    description: 'Kamera ile alinan profil/selfie fotografi',
  })
  @IsString()
  @IsOptional()
  @MaxLength(600000)
  verificationPhotoDataUrl?: string;
}
