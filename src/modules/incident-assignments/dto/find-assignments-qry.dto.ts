import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { AssignmentStatus } from '@/generated/prisma/enums';

export class FindAssignmentsQryDto {
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

  @IsUUID('7')
  @IsOptional()
  incidentId?: string;

  @IsUUID('7')
  @IsOptional()
  areaId?: string;

  @IsUUID('7')
  @IsOptional()
  operatorId?: string;

  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;
}
