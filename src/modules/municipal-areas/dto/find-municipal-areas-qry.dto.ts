import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { MunicipalAreaStatus } from '@/generated/prisma/enums';

export class FindMunicipalAreasQryDto {
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (value as string | undefined)?.trim())
  search?: string;

  @IsEnum(MunicipalAreaStatus)
  @IsOptional()
  status?: MunicipalAreaStatus;
}
