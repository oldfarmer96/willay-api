import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import type { CookieOptions, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Auth } from '@/common/decorators/auth.decorator';
import { UserRole } from '@/generated/prisma/enums';

@Controller('auth')
export class AuthController {
  private readonly accessCookieName: string;
  private readonly refreshCookieName: string;
  private readonly accessCookieOptions: CookieOptions;
  private readonly refreshCookieOptions: CookieOptions;

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    const isProduction =
      configService.getOrThrow<string>('NODE_ENV') === 'production';
    const apiPrefix = configService.getOrThrow<string>('API_PREFIX');

    const accessMaxAgeMs = 15 * 60 * 1000; // 15 minutes
    const refreshMaxAgeMs =
      configService.getOrThrow<number>('COOKIE_MAX_AGE_MS');

    this.accessCookieName = configService.getOrThrow<string>('COOKIE_NAME');

    this.accessCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: accessMaxAgeMs,
      path: '/',
    };

    this.refreshCookieName = `${this.accessCookieName}-refresh`;

    this.refreshCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: refreshMaxAgeMs,
      path: `/${apiPrefix}/auth`,
    };
  }

  @Post('mobile-login')
  @HttpCode(HttpStatus.OK)
  async mobileLogin(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(body);
  }

  @Post('web-login')
  @HttpCode(HttpStatus.OK)
  async webLogin(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto['user']> {
    const result = await this.authService.login(body);

    if (
      result.user.role !== UserRole.ADMIN &&
      result.user.role !== UserRole.OPERATOR
    ) {
      throw new ForbiddenException('No tiene acceso al panel administrativo');
    }

    response.cookie(
      this.accessCookieName,
      result.accessToken,
      this.accessCookieOptions,
    );
    response.cookie(
      this.refreshCookieName,
      result.refreshToken,
      this.refreshCookieOptions,
    );

    return result.user;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const refreshTokenStr =
      body.refreshToken ?? this.extractCookie(req, this.refreshCookieName);

    if (!refreshTokenStr) {
      throw new ForbiddenException('Refresh token requerido');
    }

    const tokens = await this.authService.refresh(refreshTokenStr);

    response.cookie(
      this.accessCookieName,
      tokens.accessToken,
      this.accessCookieOptions,
    );
    response.cookie(
      this.refreshCookieName,
      tokens.refreshToken,
      this.refreshCookieOptions,
    );

    return { accessToken: tokens.accessToken };
  }

  @Post('mobile-logout')
  @Auth()
  @HttpCode(HttpStatus.OK)
  async mobileLogout(
    @Body() body: { refreshToken?: string },
  ): Promise<{ message: string }> {
    if (body.refreshToken) {
      await this.authService.revokeRefreshToken(body.refreshToken);
    }

    return { message: 'Sesión cerrada correctamente' };
  }

  @Post('web-logout')
  @Auth()
  @HttpCode(HttpStatus.OK)
  async webLogout(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const refreshTokenStr = this.extractCookie(req, this.refreshCookieName);

    if (refreshTokenStr) {
      await this.authService.revokeRefreshToken(refreshTokenStr);
    }

    response.clearCookie(this.accessCookieName, {
      httpOnly: this.accessCookieOptions.httpOnly,
      secure: this.accessCookieOptions.secure,
      sameSite: this.accessCookieOptions.sameSite,
      path: this.accessCookieOptions.path,
    });
    response.clearCookie(this.refreshCookieName, {
      httpOnly: this.refreshCookieOptions.httpOnly,
      secure: this.refreshCookieOptions.secure,
      sameSite: this.refreshCookieOptions.sameSite,
      path: this.refreshCookieOptions.path,
    });

    return { message: 'Sesión cerrada correctamente' };
  }

  private extractCookie(req: Request, name: string): string | null {
    const value: unknown = req.cookies?.[name];
    return typeof value === 'string' ? value : null;
  }
}
