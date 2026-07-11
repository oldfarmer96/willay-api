import { UserRole } from '@/generated/prisma/enums';

export interface JwtPayload {
  sub: string;
  dni: string;
  role: UserRole;
}
