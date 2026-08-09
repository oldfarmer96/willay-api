import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import {
  ANALYZE_INCIDENT_JOB,
  AnalyzeIncidentJobData,
  INCIDENT_AI_QUEUE,
} from './incident-ai.constants';
import { IncidentAiOrchestratorService } from '../application/incident-ai-orchestrator.service';
import { IncidentAiPersistenceService } from '../application/incident-ai-persistence.service';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AiStatus } from '@/generated/prisma/enums';

@Injectable()
@Processor(INCIDENT_AI_QUEUE, {
  concurrency: 5,
})
export class IncidentAiProcessor extends WorkerHost {
  private readonly logger = new Logger(IncidentAiProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: IncidentAiOrchestratorService,
    private readonly persistence: IncidentAiPersistenceService,
  ) {
    super();
  }

  async process(job: Job<AnalyzeIncidentJobData>): Promise<void> {
    if (job.name !== ANALYZE_INCIDENT_JOB) {
      return;
    }

    const incident = await this.prisma.incident.findUnique({
      where: {
        id: job.data.incidentId,
      },
      select: {
        id: true,
        originalMessage: true,
        aiStatus: true,
      },
    });

    if (!incident) {
      this.logger.warn(`Incident ${job.data.incidentId} no longer exists`);
      return;
    }

    if (incident.aiStatus === AiStatus.PROCESSED) {
      this.logger.log(
        `Incident ${job.data.incidentId} already processed, skipping`,
      );
      return;
    }

    await this.persistence.markProcessing(incident.id);

    const attemptOffset =
      (job.attemptsMade ?? 0) * this.orchestrator.providerCount;
    let currentAttempt = 0;
    const startedAt = new Date();

    try {
      const result = await this.orchestrator.analyze(
        incident.originalMessage,
        async (error, attemptNumber) => {
          currentAttempt = attemptNumber;

          try {
            await this.persistence.saveFailedAttempt(
              incident.id,
              attemptNumber,
              error,
              startedAt,
            );
          } catch (persistError) {
            this.logger.error(
              `Failed to persist failed attempt ${attemptNumber} for incident ${incident.id}`,
              persistError instanceof Error ? persistError.stack : undefined,
            );
          }
        },
        attemptOffset,
      );

      currentAttempt += 1;

      await this.persistence.saveSuccess(
        incident.id,
        currentAttempt,
        result,
        startedAt,
      );
    } catch (error) {
      await this.persistence.markFailed(
        incident.id,
        currentAttempt,
        error instanceof Error ? error.message : 'Unknown AI processing error',
      );

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AnalyzeIncidentJobData>, error: Error): void {
    this.logger.error(`AI job ${job.id} failed: ${error.message}`);
  }
}
