import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MunicipalAreaStatus } from '@/generated/prisma/enums';

export class UpdateMunicipalAreaDto {
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(MunicipalAreaStatus)
  @IsOptional()
  status?: MunicipalAreaStatus;
}
