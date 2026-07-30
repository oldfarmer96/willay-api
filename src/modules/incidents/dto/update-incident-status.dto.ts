import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IncidentStatus } from '@/generated/prisma/enums';

export class UpdateIncidentStatusDto {
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
