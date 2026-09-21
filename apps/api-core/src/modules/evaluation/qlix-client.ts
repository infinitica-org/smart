import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { env } from '../../platform/config/env.js';
import type { QlixSmartContext } from './qlix-smart-context.js';

const QlixSubmitResponseSchema = z.object({
  checkId: z.string().min(1),
  status: z.string(),
});

const QlixAgentReviewSchema = z.object({
  status: z.string().optional(),
  verdict: z
    .object({
      summary: z.string().optional(),
      suspicionLevel: z.string().optional(),
    })
    .nullable()
    .optional(),
});

const QlixCompetencyObservationSchema = z.object({
  competencyId: z.string(),
  status: z.string().optional(),
  confidence: z.string().optional(),
  evidenceSnippets: z.array(z.string()).optional(),
  authenticityWeight: z.number().optional(),
});

export const QlixSmartAssessmentSchema = z.object({
  schemaVersion: z.string().optional(),
  relevanceScore: z.number().nullable().optional(),
  qualityScore: z.number().nullable().optional(),
  authenticityScore: z.number().nullable().optional(),
  appliedProficiencyCeiling: z.string().nullable().optional(),
  competencyObservations: z.array(QlixCompetencyObservationSchema).optional(),
  gaps: z.array(z.string()).optional(),
});

export type QlixSmartAssessment = z.infer<typeof QlixSmartAssessmentSchema>;

export const QlixCheckResultSchema = z.object({
  checkId: z.string(),
  status: z.enum(['queued', 'running', 'engine_complete', 'ai_verifying', 'completed', 'failed']),
  similarityIndex: z.number().nullable().optional(),
  similarityExcludingCited: z.number().nullable().optional(),
  confidence: z.enum(['low', 'medium', 'high']).nullable().optional(),
  aiLikelihood: z.number().nullable().optional(),
  smartAssessmentStatus: z.string().nullable().optional(),
  smartAssessment: QlixSmartAssessmentSchema.nullable().optional(),
  agentReview: QlixAgentReviewSchema.nullable().optional(),
  check: z.record(z.string(), z.unknown()).optional(),
});

export type QlixCheckResult = z.infer<typeof QlixCheckResultSchema>;

export const QlixSkillsResponseSchema = z.object({
  checkId: z.string().optional(),
  status: z.string().optional(),
  totals: z
    .object({
      analyzedFiles: z.number().optional(),
      analyzedTokens: z.number().optional(),
      analyzedCharacters: z.number().optional(),
      languageCount: z.number().optional(),
    })
    .optional(),
  languages: z.array(z.record(z.string(), z.unknown())).optional(),
  libraries: z.array(z.record(z.string(), z.unknown())).optional(),
  qualitySignals: z.record(z.string(), z.unknown()).optional(),
});

export type QlixSkillsResponse = z.infer<typeof QlixSkillsResponseSchema>;

export interface QlixSubmitInput {
  githubUrl: string;
  title: string;
  idempotencyKey: string;
  smartContext?: QlixSmartContext | null;
}

@Injectable()
export class QlixClient {
  private readonly logger = new Logger(QlixClient.name);

  isConfigured(): boolean {
    return Boolean(env.QLIX_API_KEY?.trim());
  }

  async submitCheck(input: QlixSubmitInput): Promise<{ checkId: string }> {
    if (!this.isConfigured()) {
      return { checkId: `stub-${input.idempotencyKey.slice(0, 40)}` };
    }
    const body: Record<string, unknown> = {
      githubUrl: input.githubUrl,
      title: input.title.slice(0, 300),
      contentType: 'code',
      sensitivity: 'balanced',
      archive: true,
    };
    if (input.smartContext) {
      body.smartContext = input.smartContext;
    }
    const response = await fetch(`${env.QLIX_BASE_URL}/plagiarism/checks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.QLIX_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey.slice(0, 255),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`QLIX submit ${response.status}: ${text.slice(0, 200)}`);
    }
    const parsed = QlixSubmitResponseSchema.parse(JSON.parse(text));
    return { checkId: parsed.checkId };
  }

  async getCheck(checkId: string): Promise<QlixCheckResult> {
    if (!this.isConfigured() || checkId.startsWith('stub-')) {
      return this.stubCheckResult(checkId);
    }
    const response = await fetch(`${env.QLIX_BASE_URL}/plagiarism/checks/${checkId}`, {
      headers: { Authorization: `Bearer ${env.QLIX_API_KEY}` },
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`QLIX get ${response.status}: ${text.slice(0, 200)}`);
    }
    return QlixCheckResultSchema.parse(JSON.parse(text));
  }

  async getSkills(checkId: string): Promise<QlixSkillsResponse | null> {
    if (!this.isConfigured() || checkId.startsWith('stub-')) {
      return {
        checkId,
        status: 'completed',
        totals: { analyzedFiles: 12, analyzedTokens: 4200, languageCount: 2 },
        languages: [{ language: 'typescript', percentage: 80 }],
      };
    }
    const response = await fetch(`${env.QLIX_BASE_URL}/plagiarism/checks/${checkId}/skills`, {
      headers: { Authorization: `Bearer ${env.QLIX_API_KEY}` },
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    if (response.status === 409) {
      this.logger.debug(`QLIX skills unavailable for ${checkId}: ${text.slice(0, 120)}`);
      return null;
    }
    if (!response.ok) {
      throw new Error(`QLIX skills ${response.status}: ${text.slice(0, 200)}`);
    }
    return QlixSkillsResponseSchema.parse(JSON.parse(text));
  }

  isTerminal(result: QlixCheckResult): boolean {
    return result.status === 'completed' || result.status === 'failed';
  }

  isPublishable(result: QlixCheckResult): boolean {
    return (
      result.status === 'completed' &&
      (result.agentReview?.status === 'completed' || !result.agentReview?.status)
    );
  }

  buildDigest(result: QlixCheckResult): string {
    const summary = result.agentReview?.verdict?.summary ?? 'QLIX integrity check completed.';
    const smart = result.smartAssessment;
    const lines = [
      `similarityIndex=${result.similarityIndex ?? 'n/a'}`,
      `similarityExcludingCited=${result.similarityExcludingCited ?? 'n/a'}`,
      `aiLikelihood=${result.aiLikelihood ?? 'n/a'}`,
      `suspicion=${result.agentReview?.verdict?.suspicionLevel ?? 'n/a'}`,
    ];
    if (smart?.appliedProficiencyCeiling) {
      lines.push(`appliedProficiencyCeiling=${smart.appliedProficiencyCeiling}`);
    }
    if (smart?.qualityScore != null) {
      lines.push(`qualityScore=${smart.qualityScore}`);
    }
    if (smart?.gaps?.length) {
      lines.push(`gaps=${smart.gaps.slice(0, 5).join('; ')}`);
    }
    lines.push(summary);
    return lines.join('\n').slice(0, 8_000);
  }

  logUnavailable(reason: string): void {
    this.logger.warn(`QLIX unavailable: ${reason}`);
  }

  private stubCheckResult(checkId: string): QlixCheckResult {
    return {
      checkId,
      status: 'completed',
      similarityIndex: 12,
      similarityExcludingCited: 10,
      aiLikelihood: 35,
      smartAssessmentStatus: 'completed',
      smartAssessment: {
        relevanceScore: 78,
        qualityScore: 72,
        authenticityScore: 80,
        appliedProficiencyCeiling: 'INTERMEDIATE',
        competencyObservations: [
          {
            competencyId: '828ed14b-2aca-408b-adc1-78e24f22b09d',
            status: 'PARTIALLY_DEMONSTRATED',
            confidence: 'MEDIUM',
            evidenceSnippets: ['Implemented websocket ingest module.'],
          },
        ],
        gaps: ['Limited CI coverage'],
      },
      agentReview: { status: 'completed', verdict: { summary: 'Stub QLIX pass.' } },
    };
  }
}
