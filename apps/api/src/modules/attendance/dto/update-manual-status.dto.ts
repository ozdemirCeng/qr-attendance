import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateManualStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isValid!: boolean;

  @ApiPropertyOptional({ example: 'Manuel kontrol ile duzeltildi.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
