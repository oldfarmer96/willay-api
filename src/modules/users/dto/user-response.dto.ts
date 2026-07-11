import { UserRole, UserStatus } from '@/generated/prisma/enums';

export class UserResponseDto {
  id!: string;
  name!: string;
  lastName!: string | null;
  dni!: string;
  phone!: string | null;
  email!: string | null;
  role!: UserRole;
  status!: UserStatus;
  createdAt!: Date;
  updatedAt!: Date;
}
