import { Injectable } from '@nestjs/common';
import {
  AiAnalysisResult,
  IncidentAiProvider,
} from '../../domain/ai-provider.interface';
import { AiProvider } from '@/generated/prisma/enums';
import { ConfigService } from '@nestjs/config';
import { AiResponseParser } from '../parsers/ai-response.parser';
import { INCIDENT_ANALYSIS_SYSTEM_PROMPT } from '../prompts/incident-analysis.prompt';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { incidentAnalysisJsonSchema } from '../../domain/incident-analysis.schema';
import { AiProviderError } from '../../domain/ai.errors';
import { z } from 'zod';
import { Time } from '@/common/constants/time.constant';

const cerebrasCompletionSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
      }),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .nullable()
    .optional(),
});

@Injectable()
export class CerebrasIncidentProvider implements IncidentAiProvider {
  readonly provider = AiProvider.CEREBRAS;
  readonly model = 'gpt-oss-120b';

  private readonly client: Cerebras;

  constructor(
    private readonly configService: ConfigService,
    private readonly parser: AiResponseParser,
  ) {
    const timeout = this.configService.get<number>(
      'AI_PROVIDER_TIMEOUT',
      30000,
    );
    this.client = new Cerebras({
      apiKey: this.configService.getOrThrow<string>('CEREBRAS_API_KEY'),
      timeout,
      maxRetries: 0,
    });
  }

  async analyze(message: string): Promise<AiAnalysisResult> {
    const startedAt = Date.now();

    try {
      const completion = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: INCIDENT_ANALYSIS_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: this.buildUserMessage(message),
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'municipal_incident_analysis',
              strict: true,
              schema: incidentAnalysisJsonSchema,
            },
          },
          stream: false,
          reasoning_effort: 'low',
          max_completion_tokens: 2000,
          temperature: 0.1,
        },
        {
          timeout: Time.SECOND * 30,
          maxRetries: 0,
        },
      );

      const response = cerebrasCompletionSchema.parse(completion);
      const content = response.choices[0]?.message.content;
      const analysis = this.parser.parse(content);

      return {
        analysis,
        provider: this.provider,
        model: this.model,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? null,
          completionTokens: response.usage?.completion_tokens ?? null,
          totalTokens: response.usage?.total_tokens ?? null,
        },
        latencyMs: Date.now() - startedAt,
        rawResponse: completion,
      };
    } catch (error) {
      throw new AiProviderError(
        this.provider,
        this.model,
        this.getErrorMessage(error),
        error,
      );
    }
  }

  private buildUserMessage(message: string): string {
    return [
      'Analiza el siguiente reporte ciudadano.',
      '',
      '<citizen_report>',
      message,
      '</citizen_report>',
    ].join('\n');
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown Cerebras error';
  }
}
