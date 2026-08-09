import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserStatus } from '@/generated/prisma/enums';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.refreshExpiresIn = configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
  }

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
    const refreshToken = await this.createRefreshToken(userFound.id);

    return {
      accessToken,
      refreshToken,
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

  async refresh(refreshTokenStr: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      dni: string;
      email: string | null;
      name: string;
      lastName: string | null;
      phone: string | null;
      role: string;
      status: string;
    };
  }> {
    const tokenHash = this.hashToken(refreshTokenStr);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            dni: true,
            email: true,
            name: true,
            lastName: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token revocado');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    if (storedToken.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Usuario no activo');
    }

    const newAccessToken = await this.jwtService.signAsync({
      sub: storedToken.userId,
      dni: storedToken.user.dni,
      role: storedToken.user.role,
    });

    const newRefreshToken = await this.rotateRefreshToken(
      storedToken.id,
      storedToken.userId,
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: storedToken.user.id,
        dni: storedToken.user.dni,
        email: storedToken.user.email,
        name: storedToken.user.name,
        lastName: storedToken.user.lastName,
        phone: storedToken.user.phone,
        role: storedToken.user.role,
        status: storedToken.user.status,
      },
    };
  }

  async revokeRefreshToken(refreshTokenStr: string): Promise<void> {
    const tokenHash = this.hashToken(refreshTokenStr);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const raw = crypto.randomUUID();
    const tokenHash = this.hashToken(raw);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: this.computeRefreshExpiry(),
      },
    });

    return raw;
  }

  private async rotateRefreshToken(
    oldTokenId: string,
    userId: string,
  ): Promise<string> {
    const raw = crypto.randomUUID();
    const tokenHash = this.hashToken(raw);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: oldTokenId },
        data: { revokedAt: new Date() },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: this.computeRefreshExpiry(),
        },
      }),
    ]);

    return raw;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private computeRefreshExpiry(): Date {
    const match = this.refreshExpiresIn.match(/^(\d+)([smhdw])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2] as 's' | 'm' | 'h' | 'd' | 'w';

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * (multipliers[unit] ?? 0));
  }
}
