import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
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
export class GroqIncidentProvider implements IncidentAiProvider {
  readonly provider = AiProvider.GROQ;
  readonly model = 'openai/gpt-oss-120b';

  private readonly client: Groq;

  constructor(
    private readonly configService: ConfigService,
    private readonly parser: AiResponseParser,
  ) {
    this.client = new Groq({
      apiKey: this.configService.getOrThrow<string>('GROQ_API_KEY'),
    });
  }

  async analyze(message: string): Promise<AiAnalysisResult> {
    const startedAt = Date.now();

    try {
      const completion = await this.client.chat.completions.create({
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
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'municipal_incident_analysis',
            strict: true,
            schema: incidentAnalysisJsonSchema,
          },
        },
        temperature: 0.2,
        max_completion_tokens: 2500,
        reasoning_effort: 'low',
      });

      const content = completion.choices[0].message.content;
      const analysis = this.parser.parse(content);

      return {
        analysis,
        provider: this.provider,
        model: this.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens ?? null,
          completionTokens: completion.usage?.completion_tokens ?? null,
          totalTokens: completion.usage?.total_tokens ?? null,
        },
        latencyMs: Date.now() - startedAt,
        rawResponse: completion,
      };
    } catch (error) {
      throw new AiProviderError(
        this.provider,
        this.model,
        error instanceof Error ? error.message : 'Unknown Groq error',
        error,
      );
    }
  }
}
