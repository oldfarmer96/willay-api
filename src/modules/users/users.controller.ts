import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

import { ProfileResponseDto } from './dto/profile-response.dto';
import { Auth } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { Time } from '@/common/constants/time.constant';
import { type AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  createUser(@Body() body: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.createUser(body);
  }

  @Get('profile')
  @Auth()
  @Throttle({
    default: {
      limit: 6,
      ttl: Time.MINUTE,
    },
  })
  getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProfileResponseDto> {
    return this.usersService.getProfile(user.id);
  }
}
