import { Module } from '@nestjs/common';
import { IncidentAssignmentsController } from './incident-assignments.controller';
import { IncidentAssignmentsService } from './incident-assignments.service';

@Module({
  controllers: [IncidentAssignmentsController],
  providers: [IncidentAssignmentsService],
})
export class IncidentAssignmentsModule {}
