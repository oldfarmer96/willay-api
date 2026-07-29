import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AiAnalysisResult,
  IncidentAiProvider,
} from '../domain/ai-provider.interface';
import {
  AiProviderError,
  AllAiProvidersFailedError,
} from '../domain/ai.errors';
import { AiProvider } from '@/generated/prisma/enums';
import { INCIDENT_AI_PROVIDERS } from '../ai.constants';

@Injectable()
export class IncidentAiOrchestratorService {
  private readonly logger = new Logger(IncidentAiOrchestratorService.name);

  private readonly providerOrder: AiProvider[] = [
    AiProvider.CEREBRAS,
    AiProvider.GROQ,
    AiProvider.OPENROUTER,
  ];

  constructor(
    @Inject(INCIDENT_AI_PROVIDERS)
    private readonly providers: IncidentAiProvider[],
  ) {}

  get providerCount(): number {
    return this.providerOrder.length;
  }

  async analyze(
    message: string,
    onAttemptFailed?: (
      error: AiProviderError,
      attemptNumber: number,
    ) => Promise<void>,
    attemptOffset = 0,
  ): Promise<AiAnalysisResult> {
    const orderedProviders = this.getOrderedProviders();
    const errors: AiProviderError[] = [];

    for (const [index, provider] of orderedProviders.entries()) {
      const attemptNumber = attemptOffset + index + 1;

      try {
        this.logger.log(
          `Analyzing incident with ${provider.provider}, attempt ${attemptNumber}`,
        );

        return await provider.analyze(message);
      } catch (error) {
        const providerError =
          error instanceof AiProviderError
            ? error
            : new AiProviderError(
                provider.provider,
                provider.model,
                error instanceof Error
                  ? error.message
                  : 'Unknown AI provider error',
                error,
              );

        errors.push(providerError);

        this.logger.warn(
          `${provider.provider} failed on attempt ${attemptNumber}: ${providerError.message}`,
        );

        await onAttemptFailed?.(providerError, attemptNumber);
      }
    }

    throw new AllAiProvidersFailedError(errors);
  }

  private getOrderedProviders(): IncidentAiProvider[] {
    return this.providerOrder.map((providerName) => {
      const provider = this.providers.find(
        (candidate) => candidate.provider === providerName,
      );

      if (!provider) {
        throw new Error(`AI provider ${providerName} is not registered`);
      }

      return provider;
    });
  }
}
