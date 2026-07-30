import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IncidentAssignmentsService } from './incident-assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { FindAssignmentsQryDto } from './dto/find-assignments-qry.dto';
import { Auth } from '@/common/decorators/auth.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface';
import { UserRole } from '@/generated/prisma/enums';

@Controller('incident-assignments')
export class IncidentAssignmentsController {
  constructor(
    private readonly incidentAssignmentsService: IncidentAssignmentsService,
  ) {}

  @Post()
  @Auth(UserRole.ADMIN)
  create(@Body() dto: CreateAssignmentDto) {
    return this.incidentAssignmentsService.create(dto);
  }

  @Patch(':id/status')
  @Auth(UserRole.ADMIN, UserRole.OPERATOR)
  updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: UpdateAssignmentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidentAssignmentsService.updateStatus(id, dto, user);
  }

  @Get()
  @Auth(UserRole.ADMIN, UserRole.OPERATOR)
  findAll(@Query() qry: FindAssignmentsQryDto) {
    return this.incidentAssignmentsService.findAll(qry);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN, UserRole.OPERATOR)
  findOne(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.incidentAssignmentsService.findOne(id);
  }
}
