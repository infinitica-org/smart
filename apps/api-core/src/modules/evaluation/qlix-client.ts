import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { env } from '../../platform/config/env.js';

const QlixSubmitResponseSchema = z.object({
  checkId: z.string().min(1),
  status: z.string(),
});

const QlixAgentReviewSchema = z.object({
  status: z.string().optional(),
  // QLIX may return verdict: null while ai_verifying or before agent review finishes.
  verdict: z
    .object({
      summary: z.string().optional(),
      suspicionLevel: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const QlixCheckResultSchema = z.object({
  checkId: z.string(),
  status: z.enum(['queued', 'running', 'engine_complete', 'ai_verifying', 'completed', 'failed']),
  similarityIndex: z.number().nullable().optional(),
  aiLikelihood: z.number().nullable().optional(),
  agentReview: QlixAgentReviewSchema.nullable().optional(),
  check: z.record(z.string(), z.unknown()).optional(),
});

export type QlixCheckResult = z.infer<typeof QlixCheckResultSchema>;

export interface QlixSubmitInput {
  githubUrl: string;
  title: string;
  idempotencyKey: string;
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
    const response = await fetch(`${env.QLIX_BASE_URL}/plagiarism/checks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.QLIX_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey.slice(0, 255),
      },
      body: JSON.stringify({
        githubUrl: input.githubUrl,
        title: input.title.slice(0, 300),
        contentType: 'code',
        sensitivity: 'balanced',
        archive: true,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`QLIX submit ${response.status}: ${text.slice(0, 200)}`);
    }
    const body = QlixSubmitResponseSchema.parse(JSON.parse(text));
    return { checkId: body.checkId };
  }

  async getCheck(checkId: string): Promise<QlixCheckResult> {
    if (!this.isConfigured() || checkId.startsWith('stub-')) {
      return {
        checkId,
        status: 'completed',
        similarityIndex: 12,
        aiLikelihood: 35,
        agentReview: { status: 'completed', verdict: { summary: 'Stub QLIX pass.' } },
      };
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
    return [
      `similarityIndex=${result.similarityIndex ?? 'n/a'}`,
      `aiLikelihood=${result.aiLikelihood ?? 'n/a'}`,
      `suspicion=${result.agentReview?.verdict?.suspicionLevel ?? 'n/a'}`,
      summary,
    ]
      .join('\n')
      .slice(0, 8_000);
  }

  logUnavailable(reason: string): void {
    this.logger.warn(`QLIX unavailable: ${reason}`);
  }
}
