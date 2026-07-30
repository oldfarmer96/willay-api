import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenRouter } from '@openrouter/sdk';
import {
  AiAnalysisResult,
  IncidentAiProvider,
} from '../../domain/ai-provider.interface';
import { AiProviderError } from '../../domain/ai.errors';
import { incidentAnalysisJsonSchema } from '../../domain/incident-analysis.schema';
import { INCIDENT_ANALYSIS_SYSTEM_PROMPT } from '../prompts/incident-analysis.prompt';
import { AiResponseParser } from '../parsers/ai-response.parser';
import { AiProvider } from '@/generated/prisma/enums';

@Injectable()
export class OpenRouterIncidentProvider implements IncidentAiProvider {
  readonly provider = AiProvider.OPENROUTER;
  readonly model = 'openai/gpt-oss-120b:free';

  private readonly client: OpenRouter;
  private readonly timeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly parser: AiResponseParser,
  ) {
    this.timeoutMs = this.configService.get<number>(
      'AI_PROVIDER_TIMEOUT',
      30000,
    );
    this.client = new OpenRouter({
      apiKey: this.configService.getOrThrow<string>('OPENROUTER_API_KEY'),
    });
  }

  async analyze(message: string): Promise<AiAnalysisResult> {
    const startedAt = Date.now();

    try {
      const completion = await this.client.chat.send(
        {
          chatRequest: {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: INCIDENT_ANALYSIS_SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: [
                  'Analiza el siguiente reporte ciudadano.',
                  '',
                  '<citizen_report>',
                  message,
                  '</citizen_report>',
                ].join('\n'),
              },
            ],
            responseFormat: {
              type: 'json_schema',
              jsonSchema: {
                name: 'municipal_incident_analysis',
                strict: true,
                schema: incidentAnalysisJsonSchema,
              },
            },
            temperature: 0.2,
            maxCompletionTokens: 800,
          },
        },
        {
          timeoutMs: this.timeoutMs,
          retries: { strategy: 'none' },
        },
      );

      const content: unknown = completion.choices[0]?.message?.content;
      const analysis = this.parser.parse(
        typeof content === 'string' ? content : undefined,
      );

      return {
        analysis,
        provider: this.provider,
        model: this.model,
        usage: {
          promptTokens: completion.usage?.promptTokens ?? null,
          completionTokens: completion.usage?.completionTokens ?? null,
          totalTokens: completion.usage?.totalTokens ?? null,
        },
        latencyMs: Date.now() - startedAt,
        rawResponse: completion,
      };
    } catch (error) {
      throw new AiProviderError(
        this.provider,
        this.model,
        error instanceof Error ? error.message : 'Unknown OpenRouter error',
        error,
      );
    }
  }
}
