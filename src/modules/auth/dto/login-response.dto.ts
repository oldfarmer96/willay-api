import { UserRole, UserStatus } from '@/generated/prisma/enums';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class LoginResponseDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @IsString()
  @IsNotEmpty()
  refreshToken!: string;

  @IsString()
  @IsNotEmpty()
  tokenType!: string;

  user!: UserDto;
}

export class UserDto {
  @IsString()
  @IsNotEmpty()
  dni!: string;

  @IsString()
  email!: string | null;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  lastName!: string | null;

  @IsString()
  phone!: string | null;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsEnum(UserStatus)
  status!: UserStatus;

  @IsString()
  @IsNotEmpty()
  id!: string;
}
