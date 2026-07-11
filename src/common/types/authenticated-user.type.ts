import { UserRole } from '@/generated/prisma/enums';

export interface AuthenticatedUser {
  id: string;
  dni: string;
  role: UserRole;
}
