import { Inject, Injectable, Logger } from '@nestjs/common';
import { MATCH_NARRATIVE_PROMPT_REF, MatchNarrativeOutputSchema } from '@smart/prompts';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service.js';

export interface MatchNarrativeInput {
  roleTitle: string;
  companyName: string;
  matchFacts: Record<string, unknown>;
}

@Injectable()
export class MatchNarrativeService {
  private readonly logger = new Logger(MatchNarrativeService.name);

  constructor(@Inject(AiGatewayService) private readonly gateway: AiGatewayService) {}

  async summarize(input: MatchNarrativeInput): Promise<{
    recruiterSummary: string;
    studentSummary: string;
  } | null> {
    if (!this.gateway.hasCallableProvider()) {
      return null;
    }
    try {
      const result = await this.gateway.complete({
        promptRef: MATCH_NARRATIVE_PROMPT_REF,
        modelRole: 'PRIMARY_REASONING',
        priority: 'P3_BATCH',
        variables: {
          roleTitle: input.roleTitle,
          companyName: input.companyName,
          matchFactsJson: JSON.stringify(input.matchFacts),
        },
        correlation: {},
        maxOutputTokens: 1_024,
        temperature: 0,
      });
      return MatchNarrativeOutputSchema.parse(result.output);
    } catch (error) {
      this.logger.warn(
        `Match narrative failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }
}
