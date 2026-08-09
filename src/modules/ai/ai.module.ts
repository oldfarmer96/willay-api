import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { INCIDENT_AI_QUEUE } from './queue/incident-ai.constants';
import { AiResponseParser } from './infrastructure/parsers/ai-response.parser';
import { CerebrasIncidentProvider } from './infrastructure/providers/cerebras.provider';
import { GroqIncidentProvider } from './infrastructure/providers/groq.provider';
import { OpenRouterIncidentProvider } from './infrastructure/providers/openrouter.provider';
import { INCIDENT_AI_PROVIDERS } from './ai.constants';
import { IncidentAiOrchestratorService } from './application/incident-ai-orchestrator.service';
import { IncidentAiPersistenceService } from './application/incident-ai-persistence.service';
import { IncidentAiProducer } from './queue/incident-ai.producer';
import { IncidentAiProcessor } from './queue/incident-ai.processor';

@Module({
  imports: [BullModule.registerQueue({ name: INCIDENT_AI_QUEUE })],
  providers: [
    AiResponseParser,
    CerebrasIncidentProvider,
    GroqIncidentProvider,
    OpenRouterIncidentProvider,
    {
      provide: INCIDENT_AI_PROVIDERS,
      inject: [
        CerebrasIncidentProvider,
        GroqIncidentProvider,
        OpenRouterIncidentProvider,
      ],
      useFactory: (
        cerebras: CerebrasIncidentProvider,
        groq: GroqIncidentProvider,
        openRouter: OpenRouterIncidentProvider,
      ) => [cerebras, groq, openRouter],
    },
    IncidentAiOrchestratorService,
    IncidentAiPersistenceService,
    IncidentAiProducer,
    IncidentAiProcessor,
  ],
  exports: [IncidentAiProducer, IncidentAiOrchestratorService],
})
export class AiModule {}
