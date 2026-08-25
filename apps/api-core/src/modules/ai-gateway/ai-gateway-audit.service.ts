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
  // Claude models
  'claude-3-5-sonnet-latest': { promptPerMillion: 3.0, completionPerMillion: 15.0 },
  'claude-3-5-sonnet': { promptPerMillion: 3.0, completionPerMillion: 15.0 },
  'anthropic/claude-3.5-sonnet': { promptPerMillion: 3.0, completionPerMillion: 15.0 },
  'claude-3-5-haiku-latest': { promptPerMillion: 0.8, completionPerMillion: 4.0 },
  'claude-3-5-haiku': { promptPerMillion: 0.8, completionPerMillion: 4.0 },
  'anthropic/claude-3.5-haiku': { promptPerMillion: 0.8, completionPerMillion: 4.0 },
  // Gemini models
  'gemini-2.5-pro': { promptPerMillion: 1.25, completionPerMillion: 5.0 },
  'google/gemini-2.5-pro': { promptPerMillion: 1.25, completionPerMillion: 5.0 },
  'gemini-2.5-flash': { promptPerMillion: 0.075, completionPerMillion: 0.3 },
  'google/gemini-2.5-flash': { promptPerMillion: 0.075, completionPerMillion: 0.3 },
  // Default fallback
  default: DEFAULT_PRICING,
};

export interface RecordAuditParams {
  readonly promptRef: string;
  readonly provider: AiProvider;
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly usedFallback: boolean;
  readonly responseId?: string | null;
  readonly latencyMs?: number;
}

export interface AuditRecordResult {
  readonly auditId: string;
  readonly estimatedCostUsd: number;
}

@Injectable()
export class AiGatewayAuditService {
  private readonly logger = new Logger(AiGatewayAuditService.name);

  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

  /**
   * Calculates estimated USD cost from prompt and completion token consumption.
   * Rates are defined per 1,000,000 tokens. Result is rounded to 6 decimal places.
   */
  calculateCostUsd(model: string, promptTokens: number, completionTokens: number): number {
    const matchedPricing: ModelPricing =
      MODEL_PRICING_TABLE[model] ??
      MODEL_PRICING_TABLE[model.toLowerCase()] ??
      this.findPricingByModelPrefix(model) ??
      DEFAULT_PRICING;

    const promptCost = (Math.max(0, promptTokens) * matchedPricing.promptPerMillion) / 1_000_000;
    const completionCost =
      (Math.max(0, completionTokens) * matchedPricing.completionPerMillion) / 1_000_000;
    const totalCost = promptCost + completionCost;

    return Number(totalCost.toFixed(6));
  }

  /**
   * Persists an audit row in `ai_evaluation_audits` on every gateway call.
   * Guaranteed: No raw prompt/answer text or candidate PII is persisted in the audit table.
   *
   * Failure mode policy:
   * If writing to the audit table fails (e.g. database down or response_id FK mismatch),
   * the failure is logged with full diagnostics without crashing the grading pipeline.
   */
  async recordAudit(params: RecordAuditParams): Promise<AuditRecordResult> {
    const auditId = randomUUID();
    const estimatedCostUsd = this.calculateCostUsd(
      params.model,
      params.promptTokens,
      params.completionTokens,
    );

    if (!this.prisma) {
      this.logger.debug(
        `PrismaService not injected. Audit logged in-memory: [${auditId}] ${params.promptRef} | ` +
          `provider=${params.provider} model=${params.model} tokens=${params.promptTokens}+${params.completionTokens} ` +
          `cost=$${estimatedCostUsd.toFixed(6)}`,
      );
      return { auditId, estimatedCostUsd };
    }

    try {
      const prismaProvider = this.mapProvider(params.provider, params.model);

      await this.prisma.aiEvaluationAudit.create({
        data: {
          id: auditId,
          promptRef: params.promptRef,
          provider: prismaProvider,
          model: params.model,
          promptTokens: Math.max(0, params.promptTokens),
          completionTokens: Math.max(0, params.completionTokens),
          usedFallback: params.usedFallback,
          estimatedCostUsd,
          responseId: params.responseId || null,
        },
      });

      this.logger.log(
        `Audit row written: [${auditId}] ${params.promptRef} (${prismaProvider}/${params.model}) ` +
          `tokens=${params.promptTokens}+${params.completionTokens} cost=$${estimatedCostUsd.toFixed(6)} ` +
          `fallback=${params.usedFallback}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to write AI audit row for promptRef=${params.promptRef} auditId=${auditId}: ${msg}`,
      );
    }

    return { auditId, estimatedCostUsd };
  }

  private findPricingByModelPrefix(model: string): ModelPricing | null {
    const lower = model.toLowerCase();
    if (lower.includes('sonnet')) {
      return MODEL_PRICING_TABLE['claude-3-5-sonnet-latest'] ?? null;
    }
    if (lower.includes('haiku')) {
      return MODEL_PRICING_TABLE['claude-3-5-haiku-latest'] ?? null;
    }
    if (lower.includes('gemini') && lower.includes('pro')) {
      return MODEL_PRICING_TABLE['gemini-2.5-pro'] ?? null;
    }
    if (lower.includes('gemini') && lower.includes('flash')) {
      return MODEL_PRICING_TABLE['gemini-2.5-flash'] ?? null;
    }
    return null;
  }

  private mapProvider(provider: AiProvider, model: string): 'ANTHROPIC' | 'GOOGLE' {
    if (provider === 'GOOGLE' || model.toLowerCase().includes('gemini')) {
      return 'GOOGLE';
    }
    return 'ANTHROPIC';
  }
}
