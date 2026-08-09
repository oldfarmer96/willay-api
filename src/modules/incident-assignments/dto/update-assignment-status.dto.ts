import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AssignmentStatus } from '@/generated/prisma/enums';

export class UpdateAssignmentStatusDto {
  @IsEnum(AssignmentStatus)
  status!: AssignmentStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
