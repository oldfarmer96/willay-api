import { Injectable } from '@nestjs/common';
import { AiAnalysisResult } from '../domain/ai-provider.interface';
import { AiProviderError } from '../domain/ai.errors';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AiStatus } from '@/generated/prisma/enums';
import { Prisma } from '@/generated/prisma/client';

@Injectable()
export class IncidentAiPersistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async markProcessing(incidentId: string): Promise<void> {
    await this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        aiStatus: AiStatus.PROCESSING,
        aiError: null,
      },
    });
  }

  async saveFailedAttempt(
    incidentId: string,
    attemptNumber: number,
    error: AiProviderError,
    startedAt: Date,
  ): Promise<void> {
    await this.prisma.aiLog.create({
      data: {
        incidentId,
        provider: error.provider,
        model: error.model,
        status: AiStatus.ERROR,
        attemptNumber,
        errorMessage: error.message,
        startedAt,
        completedAt: new Date(),
      },
    });
  }

  async saveSuccess(
    incidentId: string,
    attemptNumber: number,
    result: AiAnalysisResult,
    startedAt: Date,
  ): Promise<void> {
    const { analysis } = result;

    await this.prisma.$transaction(async (tx) => {
      await tx.incident.update({
        where: { id: incidentId },
        data: {
          type: analysis.type,
          category: analysis.category,
          urgency: analysis.urgency,
          sentiment: analysis.sentiment,
          improvedDescription: analysis.improvedDescription,
          recommendedAction: analysis.recommendedAction,
          requiresSupervision: analysis.requiresSupervision,
          keywords: analysis.keywords,

          aiStatus: AiStatus.PROCESSED,
          aiProvider: result.provider,
          aiModel: result.model,
          aiAttempts: attemptNumber,
          aiError: null,

          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,

          entities: {
            deleteMany: {},
            create: analysis.entities.map((entity) => ({
              type: entity.type,
              value: entity.value,
              confidence:
                entity.confidence === null
                  ? null
                  : new Prisma.Decimal(entity.confidence),
            })),
          },
        },
      });

      await tx.aiLog.create({
        data: {
          incidentId,
          provider: result.provider,
          model: result.model,
          status: AiStatus.PROCESSED,
          attemptNumber,

          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          latencyMs: result.latencyMs,

          rawResponse: result.rawResponse as Prisma.InputJsonValue,

          startedAt,
          completedAt: new Date(),
        },
      });
    });
  }

  async markFailed(
    incidentId: string,
    attempts: number,
    message: string,
  ): Promise<void> {
    await this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        aiStatus: AiStatus.ERROR,
        aiAttempts: attempts,
        aiError: message,
        requiresSupervision: true,
      },
    });
  }
}
