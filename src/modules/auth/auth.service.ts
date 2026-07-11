import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcryptjs';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserStatus } from '@/generated/prisma/enums';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const userFound = await this.prisma.user.findUnique({
      where: {
        dni: dto.dni,
      },
      select: {
        id: true,
        dni: true,
        email: true,
        name: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!userFound) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordIsValid = await bcrypt.compare(
      dto.password,
      userFound.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (userFound.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('El usuario no está activo');
    }

    const payload: JwtPayload = {
      sub: userFound.id,
      dni: userFound.dni,
      role: userFound.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: userFound.id,
        dni: userFound.dni,
        email: userFound.email,
        name: userFound.name,
        lastName: userFound.lastName,
        phone: userFound.phone,
        role: userFound.role,
        status: userFound.status,
      },
    };
  }
}
