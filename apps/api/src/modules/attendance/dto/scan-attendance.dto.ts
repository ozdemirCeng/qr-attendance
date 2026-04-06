import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class ScanAttendanceDto {
  @IsString()
  token!: string;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;

  @IsNumber()
  @IsOptional()
  locationAccuracy?: number;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  fingerprint?: string;
}
