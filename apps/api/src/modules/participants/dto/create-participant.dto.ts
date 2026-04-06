import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateParticipantDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
