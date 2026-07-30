import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID('7')
  incidentId!: string;

  @IsUUID('7')
  areaId!: string;

  @IsUUID('7')
  @IsOptional()
  operatorId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
