import { UserRole, UserStatus } from '@/generated/prisma/enums';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UserResponseDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  lastName!: string | null;

  @IsString()
  @IsNotEmpty()
  dni!: string;

  @IsString()
  @IsOptional()
  phone!: string | null;

  @IsString()
  @IsOptional()
  email!: string | null;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsEnum(UserStatus)
  status!: UserStatus;

  @IsDate()
  createdAt!: Date;

  @IsDate()
  updatedAt!: Date;
}
