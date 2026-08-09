import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MunicipalAreasService } from './municipal-areas.service';
import { CreateMunicipalAreaDto } from './dto/create-municipal-area.dto';
import { UpdateMunicipalAreaDto } from './dto/update-municipal-area.dto';
import { FindMunicipalAreasQryDto } from './dto/find-municipal-areas-qry.dto';
import { Auth } from '@/common/decorators/auth.decorator';
import { UserRole } from '@/generated/prisma/enums';

@Controller('municipal-areas')
export class MunicipalAreasController {
  constructor(private readonly municipalAreasService: MunicipalAreasService) {}

  @Post()
  @Auth(UserRole.ADMIN)
  create(@Body() dto: CreateMunicipalAreaDto) {
    return this.municipalAreasService.create(dto);
  }

  @Get()
  @Auth(UserRole.ADMIN)
  findAll(@Query() qry: FindMunicipalAreasQryDto) {
    return this.municipalAreasService.findAll(qry);
  }

  @Get(':id')
  @Auth(UserRole.ADMIN)
  findOne(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.municipalAreasService.findOne(id);
  }

  @Patch(':id')
  @Auth(UserRole.ADMIN)
  update(
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: UpdateMunicipalAreaDto,
  ) {
    return this.municipalAreasService.update(id, dto);
  }

  @Delete(':id')
  @Auth(UserRole.ADMIN)
  remove(@Param('id', new ParseUUIDPipe({ version: '7' })) id: string) {
    return this.municipalAreasService.remove(id);
  }
}
