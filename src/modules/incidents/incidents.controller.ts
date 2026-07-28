import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { Auth } from '@/common/decorators/auth.decorator';
import { UserRole } from '@/generated/prisma/enums';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @Auth(UserRole.CITIZEN)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.incidentsService.create(user.id, dto);
  }

  @Get(':id')
  @Auth(UserRole.CITIZEN, UserRole.ADMIN, UserRole.OPERATOR)
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '7',
        exceptionFactory() {
          return new BadRequestException('Id invalido');
        },
      }),
    )
    id: string,
  ) {
    return this.incidentsService.findOne(id, user);
  }
}
