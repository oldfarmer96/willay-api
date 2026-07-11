import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import type { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Auth } from '@/common/decorators/auth.decorator';

@Controller('auth')
export class AuthController {
  private readonly cookieName: string;
  private readonly cookieOptions: CookieOptions;
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    const isProduction =
      configService.getOrThrow<string>('NODE_ENV') === 'production';

    const cookieMaxAgeMs =
      configService.getOrThrow<number>('COOKIE_MAX_AGE_MS');

    this.cookieName = configService.getOrThrow<string>('COOKIE_NAME');

    this.cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: cookieMaxAgeMs,
      path: '/',
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

    response.cookie(this.cookieName, result.accessToken, this.cookieOptions);

    return result.user;
  }

  @Post('web-logout')
  @Auth()
  @HttpCode(HttpStatus.OK)
  webLogout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(this.cookieName, {
      httpOnly: this.cookieOptions.httpOnly,
      secure: this.cookieOptions.secure,
      sameSite: this.cookieOptions.sameSite,
      path: this.cookieOptions.path,
    });

    return {
      message: 'Sesión cerrada correctamente',
    };
  }
}
