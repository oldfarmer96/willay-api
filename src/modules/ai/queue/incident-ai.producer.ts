import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  ANALYZE_INCIDENT_JOB,
  AnalyzeIncidentJobData,
  INCIDENT_AI_QUEUE,
} from './incident-ai.constants';

@Injectable()
export class IncidentAiProducer {
  constructor(
    @InjectQueue(INCIDENT_AI_QUEUE)
    private readonly queue: Queue<AnalyzeIncidentJobData>,
  ) {}

  async enqueue(incidentId: string): Promise<void> {
    await this.queue.add(
      ANALYZE_INCIDENT_JOB,
      {
        incidentId,
      },
      {
        jobId: `incident-analysis-${incidentId}`,

        attempts: 2,

        backoff: {
          type: 'exponential',
          delay: 5_000,
        },

        removeOnComplete: {
          age: 3_600,
          count: 500,
        },

        removeOnFail: {
          age: 86_400,
          count: 1_000,
        },
      },
    );
  }
}
