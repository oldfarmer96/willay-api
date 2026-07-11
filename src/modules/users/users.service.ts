import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { ConflictException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import bcrypt from 'bcryptjs';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          lastName: dto.lastName,
          dni: dto.dni,
          phone: dto.phone,
          email: dto.email,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          lastName: true,
          dni: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Los datos ya están en uso.');
      }

      throw error;
    }
  }
}
