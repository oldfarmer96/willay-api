import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  IncidentStatus,
  AiStatus,
  IncidentType,
  IncidentCategory,
  UrgencyLevel,
} from '@/generated/prisma/enums';

export class FindIncidentsQryDto {
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

  @IsEnum(IncidentStatus)
  @IsOptional()
  status?: IncidentStatus;

  @IsEnum(AiStatus)
  @IsOptional()
  aiStatus?: AiStatus;

  @IsEnum(IncidentType)
  @IsOptional()
  type?: IncidentType;

  @IsEnum(IncidentCategory)
  @IsOptional()
  category?: IncidentCategory;

  @IsEnum(UrgencyLevel)
  @IsOptional()
  urgency?: UrgencyLevel;

  @Transform(({ value }) => value === 'true' || value === '1')
  @IsBoolean()
  @IsOptional()
  requiresSupervision?: boolean;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}
