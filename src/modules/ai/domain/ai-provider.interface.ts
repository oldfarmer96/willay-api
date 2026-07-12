import { AiProvider } from '@/generated/prisma/enums';
import { IncidentAnalysis } from './incident-analysis.schema';

export interface AiTokenUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
}

export interface AiAnalysisResult {
  analysis: IncidentAnalysis;
  provider: AiProvider;
  model: string;
  usage: AiTokenUsage;
  latencyMs: number;
  rawResponse: unknown;
}

export interface IncidentAiProvider {
  readonly provider: AiProvider;
  readonly model: string;

  analyze(message: string): Promise<AiAnalysisResult>;
}
