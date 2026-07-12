import { Injectable } from '@nestjs/common';
import {
  IncidentAnalysis,
  incidentAnalysisSchema,
} from '../../domain/incident-analysis.schema';

@Injectable()
export class AiResponseParser {
  parse(content: string | null | undefined): IncidentAnalysis {
    if (!content) {
      throw new Error('The AI provider returned empty content');
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('The AI provider returned invalid JSON');
    }

    return incidentAnalysisSchema.parse(parsed);
  }
}
