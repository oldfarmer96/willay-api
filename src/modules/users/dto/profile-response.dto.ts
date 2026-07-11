import { UserRole, UserStatus } from '@/generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ProfileResponseDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  lastName?: string | null;

  @IsString()
  @IsNotEmpty()
  dni!: string;

  @IsString()
  @IsOptional()
  email?: string | null;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @IsOptional()
  phone?: string | null;

  @IsEnum(UserStatus)
  status!: UserStatus;

  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;
}
