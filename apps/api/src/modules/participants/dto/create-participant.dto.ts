import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateParticipantDto {
  @ApiProperty({
    example: 'Ahmet Yilmaz',
    maxLength: 160,
  })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({
    example: 'ahmet@example.com',
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
