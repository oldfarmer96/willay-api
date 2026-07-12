import { Module } from '@nestjs/common';
import { MunicipalAreasController } from './municipal-areas.controller';
import { MunicipalAreasService } from './municipal-areas.service';

@Module({
  controllers: [MunicipalAreasController],
  providers: [MunicipalAreasService],
})
export class MunicipalAreasModule {}
