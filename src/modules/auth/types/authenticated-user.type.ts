import { UserRole, UserStatus } from '@/generated/prisma/enums';

export interface AuthenticatedUser {
  id: string;
  dni: string;
  name: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
}
