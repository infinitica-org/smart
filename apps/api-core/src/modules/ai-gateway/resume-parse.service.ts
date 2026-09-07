import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ParseResumeRequestSchema,
  ParseResumeResponseSchema,
  ResumeParseDraftSchema,
  type ParseResumeResponse,
} from '@smart/contracts';
import { AiGatewayService } from './ai-gateway.service.js';

export const RESUME_PARSE_PROMPT_REF = 'resume-parse@1' as const;

/**
 * CN-T02 — student resume parse. LLM traffic goes only through AiGatewayService.
 * CI stubs that service; adapters are never called from unit tests.
 */
@Injectable()
export class ResumeParseService {
  readonly owner = 'Ramansh';
  readonly purpose = 'Parse resume text into a ResumeParseDraft for onboarding pre-fill.';
  private readonly logger = new Logger(ResumeParseService.name);

  constructor(@Inject(AiGatewayService) private readonly gateway: AiGatewayService) {}

  async parse(body: unknown): Promise<ParseResumeResponse> {
    const request = ParseResumeRequestSchema.parse(body);
    const rawText = request.rawText?.trim();
    if (!rawText) {
      this.logger.warn('Resume parse skipped: objectKey storage is not implemented.');
      return ParseResumeResponseSchema.parse({ status: 'FAILED', draft: null });
    }

    try {
      const output = await this.completeDraft(rawText);
      const draft = ResumeParseDraftSchema.parse(output);
      return ParseResumeResponseSchema.parse({ status: 'PARSED', draft });
    } catch (_err) {
      return ParseResumeResponseSchema.parse({ status: 'FAILED', draft: null });
    }
  }

  private buildFallbackDraft(rawText: string) {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const nameWords = (lines[0] ?? 'Candidate User').split(/\s+/);
    const firstName = nameWords[0] || 'Candidate';
    const lastName = nameWords.slice(1).join(' ') || 'User';

    const phoneMatch = rawText.match(/(?:\+?91[\s-]*)?([6-9]\d{9})/);
    const phoneNumber = phoneMatch ? phoneMatch[1] : '';

    const linkedinMatch = rawText.match(
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i,
    );
    const linkedinUrl = linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '';

    return {
      basicInfo: {
        firstName,
        lastName,
        phoneNumber: phoneNumber || undefined,
        phoneCountryCode: '+91',
        linkedinUrl: linkedinUrl || undefined,
      },
      skills: [],
      education: [],
      experiences: [],
      licenses: [],
      parseConfidence: 0.5,
      missingFields: [],
    };
  }

  private async completeDraft(rawText: string): Promise<unknown> {
    const result = await this.gateway.complete({
      promptRef: RESUME_PARSE_PROMPT_REF,
      modelRole: 'PRIMARY_REASONING',
      priority: 'P3_BATCH',
      variables: { rawText },
      correlation: {},
      maxOutputTokens: 4_096,
      temperature: 0,
    });
    return result.output;
  }
}
