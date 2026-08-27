import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { AiProvider } from '@smart/contracts';
import { PrismaService } from '../../platform/prisma/prisma.service.js';

export interface ModelPricing {
  readonly promptPerMillion: number;
  readonly completionPerMillion: number;
}

const DEFAULT_PRICING: ModelPricing = { promptPerMillion: 1.0, completionPerMillion: 3.0 };

export const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
  'claude-3-5-sonnet-latest': { promptPerMillion: 3.0, completionPerMillion: 15.0 },
  'claude-3-5-haiku-latest': { promptPerMillion: 0.8, completionPerMillion: 4.0 },
  'gemini-2.5-pro': { promptPerMillion: 1.25, completionPerMillion: 10.0 },
  'gemini-2.5-flash': { promptPerMillion: 0.15, completionPerMillion: 0.6 },
  'anthropic/claude-3.5-sonnet': { promptPerMillion: 3.0, completionPerMillion: 15.0 },
  'anthropic/claude-3.5-haiku': { promptPerMillion: 0.8, completionPerMillion: 4.0 },
  'google/gemini-2.5-pro': { promptPerMillion: 1.25, completionPerMillion: 10.0 },
  'google/gemini-2.5-flash': { promptPerMillion: 0.15, completionPerMillion: 0.6 },
};

export interface AuditRecordInput {
  readonly promptRef: string;
  readonly provider: AiProvider;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly latencyMs: number;
  readonly usedFallback: boolean;
  readonly responseId?: string;
}

export interface AuditRecordResult {
  readonly auditId: string | null;
  readonly estimatedCostUsd: number;
}

@Injectable()
export class AiGatewayAuditService {
  private readonly logger = new Logger(AiGatewayAuditService.name);

  constructor(@Optional() @Inject(PrismaService) private readonly prisma?: PrismaService) {}

  estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = MODEL_PRICING_TABLE[model] ?? DEFAULT_PRICING;
    const raw =
      (promptTokens / 1_000_000) * pricing.promptPerMillion +
      (completionTokens / 1_000_000) * pricing.completionPerMillion;
    return Number(raw.toFixed(6));
  }

  async record(input: AuditRecordInput): Promise<AuditRecordResult> {
    const estimatedCostUsd = this.estimateCostUsd(
      input.model,
      input.promptTokens,
      input.completionTokens,
    );

    const data = {
      promptRef: input.promptRef,
      provider: input.provider,
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      latencyMs: input.latencyMs,
      usedFallback: input.usedFallback,
      estimatedCostUsd,
      responseId: input.responseId,
    };

    if (!this.prisma) {
      this.logger.warn('Prisma is unavailable; skipping ai_evaluation_audits insert.');
      return { auditId: null, estimatedCostUsd };
    }

    try {
      const row = await this.prisma.aiEvaluationAudit.create({
        data: {
          promptRef: data.promptRef,
          provider: data.provider,
          model: data.model,
          promptTokens: data.promptTokens,
          completionTokens: data.completionTokens,
          latencyMs: data.latencyMs,
          usedFallback: data.usedFallback,
          estimatedCostUsd: data.estimatedCostUsd,
          responseId: data.responseId,
        },
        select: { id: true },
      });
      return { auditId: row.id, estimatedCostUsd };
    } catch (err) {
      this.logger.warn(
        `Audit insert failed; completion still returned. ${err instanceof Error ? err.message : String(err)}`,
      );
      return { auditId: null, estimatedCostUsd };
    }
  }
}
